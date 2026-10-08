import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listCustomers } from "@/services/customer-service";
import type { TransactionListItem } from "@/types/database";
import { bucketDailySales, percentChange } from "@/utils/transaction-math";

export type SalesPeriod = "month" | "30d";

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfPreviousMonthIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function periodStart(period: SalesPeriod): string {
  return period === "month" ? startOfMonthIso() : daysAgoIso(30);
}

function previousPeriodStart(period: SalesPeriod): string {
  if (period === "month") return startOfPreviousMonthIso();
  return daysAgoIso(60);
}

function topProductLabel(descriptions: string[]): string {
  if (descriptions.length === 0) return "—";
  const counts = new Map<string, number>();
  for (const raw of descriptions) {
    const label = raw.trim() || "General";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let best = "—";
  let max = 0;
  for (const [label, n] of counts) {
    if (n > max) {
      max = n;
      best = label.length > 18 ? `${label.slice(0, 16)}…` : label;
    }
  }
  return best;
}

export async function fetchSalesDashboard(
  businessId: string,
  period: SalesPeriod = "month",
): Promise<{
  totalSales: number;
  salesChangePct: number | null;
  orderCount: number;
  ordersChangePct: number | null;
  averageOrder: number;
  averageChangePct: number | null;
  customerCount: number;
  customersChangePct: number | null;
  topProduct: string;
  sparkline: { label: string; sales: number }[];
  recentSales: TransactionListItem[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const currentStart = periodStart(period);
  const prevStart = previousPeriodStart(period);

  const [currentTx, prevTx, customersRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, customers(name), suppliers(name)")
      .eq("business_id", businessId)
      .eq("type", "sale")
      .gte("occurred_at", currentStart)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount, occurred_at")
      .eq("business_id", businessId)
      .eq("type", "sale")
      .gte("occurred_at", prevStart)
      .lt("occurred_at", currentStart),
    listCustomers(businessId),
  ]);

  if (currentTx.error) {
    return emptyDashboard(currentTx.error.message);
  }

  const currentRows = (currentTx.data ?? []) as TransactionListItem[];
  const prevRows = prevTx.data ?? [];

  const totalSales = currentRows.reduce((s, r) => s + Number(r.amount), 0);
  const prevSales = prevRows.reduce((s, r) => s + Number(r.amount), 0);
  const orderCount = currentRows.length;
  const prevOrderCount = prevRows.length;
  const averageOrder = orderCount > 0 ? totalSales / orderCount : 0;
  const prevAverage = prevOrderCount > 0 ? prevSales / prevOrderCount : 0;

  const customerCount = customersRes.data.length;
  const prevCustomerEstimate = Math.max(0, customerCount - Math.min(3, orderCount));

  const dayCount = period === "month" ? new Date().getDate() : 30;
  const sparkFrom = new Date(currentStart);
  const sparkline = bucketDailySales(
    currentRows.map((r) => ({
      type: "sale",
      amount: Number(r.amount),
      occurred_at: r.occurred_at,
    })),
    sparkFrom,
    dayCount,
  );

  return {
    totalSales,
    salesChangePct: percentChange(totalSales, prevSales),
    orderCount,
    ordersChangePct: percentChange(orderCount, prevOrderCount),
    averageOrder,
    averageChangePct: percentChange(averageOrder, prevAverage),
    customerCount,
    customersChangePct: percentChange(customerCount, prevCustomerEstimate),
    topProduct: topProductLabel(
      currentRows.map((r) => r.description ?? r.customers?.name ?? "Sale"),
    ),
    sparkline,
    recentSales: currentRows.slice(0, 10),
    error: prevTx.error?.message ?? customersRes.error ?? null,
  };
}

function emptyDashboard(error: string) {
  return {
    totalSales: 0,
    salesChangePct: null,
    orderCount: 0,
    ordersChangePct: null,
    averageOrder: 0,
    averageChangePct: null,
    customerCount: 0,
    customersChangePct: null,
    topProduct: "—",
    sparkline: [],
    recentSales: [],
    error,
  };
}
