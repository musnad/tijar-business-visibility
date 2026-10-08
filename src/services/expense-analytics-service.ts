import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TransactionListItem } from "@/types/database";
import { percentChange } from "@/utils/transaction-math";
import type { SalesPeriod } from "@/services/sales-analytics-service";

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

function topCategoryLabel(descriptions: string[]): string {
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

function bucketDailyExpenses(
  rows: { amount: number; occurred_at: string }[],
  from: Date,
  days: number,
): { label: string; amount: number }[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const key = row.occurred_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(row.amount));
    }
  }
  return [...buckets.entries()].map(([key, amount]) => ({
    label: new Date(key).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
    amount,
  }));
}

export async function fetchExpenseDashboard(
  businessId: string,
  period: SalesPeriod = "month",
): Promise<{
  totalExpenses: number;
  expensesChangePct: number | null;
  expenseCount: number;
  countChangePct: number | null;
  averageExpense: number;
  averageChangePct: number | null;
  topCategory: string;
  sparkline: { label: string; amount: number }[];
  recentExpenses: TransactionListItem[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const currentStart = periodStart(period);
  const prevStart = previousPeriodStart(period);

  const [currentTx, prevTx] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, customers(name), suppliers(name)")
      .eq("business_id", businessId)
      .eq("type", "expense")
      .gte("occurred_at", currentStart)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount, occurred_at")
      .eq("business_id", businessId)
      .eq("type", "expense")
      .gte("occurred_at", prevStart)
      .lt("occurred_at", currentStart),
  ]);

  if (currentTx.error) {
    return {
      totalExpenses: 0,
      expensesChangePct: null,
      expenseCount: 0,
      countChangePct: null,
      averageExpense: 0,
      averageChangePct: null,
      topCategory: "—",
      sparkline: [],
      recentExpenses: [],
      error: currentTx.error.message,
    };
  }

  const currentRows = (currentTx.data ?? []) as TransactionListItem[];
  const prevRows = prevTx.data ?? [];

  const totalExpenses = currentRows.reduce((s, r) => s + Number(r.amount), 0);
  const prevTotal = prevRows.reduce((s, r) => s + Number(r.amount), 0);
  const expenseCount = currentRows.length;
  const prevCount = prevRows.length;
  const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;
  const prevAverage = prevCount > 0 ? prevTotal / prevCount : 0;

  const dayCount = period === "month" ? new Date().getDate() : 30;
  const sparkline = bucketDailyExpenses(
    currentRows.map((r) => ({ amount: Number(r.amount), occurred_at: r.occurred_at })),
    new Date(currentStart),
    dayCount,
  );

  return {
    totalExpenses,
    expensesChangePct: percentChange(totalExpenses, prevTotal),
    expenseCount,
    countChangePct: percentChange(expenseCount, prevCount),
    averageExpense,
    averageChangePct: percentChange(averageExpense, prevAverage),
    topCategory: topCategoryLabel(currentRows.map((r) => r.description ?? "Expense")),
    sparkline,
    recentExpenses: currentRows.slice(0, 10),
    error: prevTx.error?.message ?? null,
  };
}
