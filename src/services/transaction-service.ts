import type { RecordTransactionInput } from "@/features/transactions/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProduct, recordStockMovement } from "@/services/product-service";
import type { Transaction, TransactionListItem, TransactionType } from "@/types/database";
import { saleLineTotals, unitCost } from "@/utils/product-profit";
import { bucketDailySales, sumSalesAndExpenses } from "@/utils/transaction-math";

type TxRow = { type: string; amount: number; occurred_at: string };

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function createTransaction(
  businessId: string,
  profileId: string,
  input: RecordTransactionInput,
): Promise<{ transaction: Transaction | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();

  const paymentMethod = input.paymentMethod ?? null;

  let productId: string | null = input.productId ?? null;
  let quantity: number | null = input.quantity ?? null;
  let lineCost: number | null = null;
  let lineProfit: number | null = null;
  let description = input.description?.trim() || null;
  let productKind: "goods" | "service" | null = null;

  if (input.type === "sale" && input.productId) {
    const { product, error: productError } = await getProduct(input.productId);
    if (productError || !product) {
      return { transaction: null, error: productError ?? "Product not found" };
    }
    productKind = product.kind ?? "goods";
    const qty = quantity && quantity > 0 ? quantity : 1;
    quantity = qty;
    const unitPrice =
      product.sale_price != null ? Number(product.sale_price) : Number(input.amount) / qty;
    const costPerUnit = unitCost(product);
    const totals = saleLineTotals(unitPrice, costPerUnit, qty);
    lineCost = totals.cost;
    lineProfit = totals.profit;
    if (!description) description = product.name;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      business_id: businessId,
      type: input.type,
      amount: input.amount,
      currency: "NGN",
      payment_method: paymentMethod,
      description,
      customer_id: input.customerId ?? null,
      supplier_id: input.supplierId ?? null,
      product_id: productId,
      quantity,
      line_cost: lineCost,
      line_profit: lineProfit,
      created_by: profileId,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return { transaction: null, error: error.message };

  const transaction = data as Transaction;

  if (
    input.type === "sale" &&
    productId &&
    productKind === "goods" &&
    quantity &&
    quantity > 0
  ) {
    const stockErr = await recordStockMovement(
      businessId,
      profileId,
      productId,
      -quantity,
      "sale",
      description ?? "Sale",
      transaction.id,
    );
    if (stockErr) {
      return { transaction, error: stockErr };
    }
  }

  await supabase.from("business_events").insert({
    business_id: businessId,
    event_type: "TRANSACTION_CREATED",
    payload: {
      transaction_id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
    },
  });

  return { transaction, error: null };
}

export async function listTransactionsForExport(
  businessId: string,
  limit = 5000,
): Promise<{ data: TransactionListItem[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, customers(name), suppliers(name), products(name, image_url)")
    .eq("business_id", businessId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TransactionListItem[], error: null };
}

export async function listRecentTransactions(
  businessId: string,
  limit = 20,
): Promise<{ data: TransactionListItem[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, customers(name), suppliers(name), products(name, image_url)")
    .eq("business_id", businessId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TransactionListItem[], error: null };
}

export async function fetchTodayTotals(businessId: string): Promise<{
  sales: number;
  expenses: number;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("business_id", businessId)
    .gte("occurred_at", startOfTodayIso());

  if (error) return { sales: 0, expenses: 0, error: error.message };

  let sales = 0;
  let expenses = 0;
  for (const row of data ?? []) {
    const type = row.type as TransactionType;
    const amount = Number(row.amount);
    if (type === "sale" || type === "customer_payment") {
      sales += amount;
    } else if (type === "expense" || type === "purchase" || type === "supplier_payment") {
      expenses += amount;
    }
  }
  return { sales, expenses, error: null };
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchRowsSince(businessId: string, sinceIso: string): Promise<{
  rows: TxRow[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, occurred_at")
    .eq("business_id", businessId)
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as TxRow[], error: null };
}

export async function fetchPeriodAnalytics(
  businessId: string,
  periodDays = 30,
): Promise<{
  current: { sales: number; expenses: number; profit: number };
  previous: { sales: number; expenses: number; profit: number };
  daily: { label: string; sales: number }[];
  error: string | null;
}> {
  const currentStart = daysAgoIso(periodDays);
  const previousStart = daysAgoIso(periodDays * 2);

  const [currentRes, previousRes] = await Promise.all([
    fetchRowsSince(businessId, currentStart),
    fetchRowsSince(businessId, previousStart),
  ]);

  if (currentRes.error) {
    return {
      current: { sales: 0, expenses: 0, profit: 0 },
      previous: { sales: 0, expenses: 0, profit: 0 },
      daily: [],
      error: currentRes.error,
    };
  }

  const previousOnly = previousRes.rows.filter((r) => r.occurred_at < currentStart);
  const currentTotals = sumSalesAndExpenses(currentRes.rows);
  const previousTotals = sumSalesAndExpenses(previousOnly);

  const from = new Date(currentStart);
  const daily = bucketDailySales(currentRes.rows, from, periodDays);

  return {
    current: currentTotals,
    previous: previousTotals,
    daily,
    error: previousRes.error,
  };
}
