import type { TransactionType } from "@/types/database";

export type AmountRow = { type: TransactionType | string; amount: number };

export function isMoneyIn(type: string): boolean {
  return type === "sale" || type === "customer_payment";
}

export function isMoneyOut(type: string): boolean {
  return type === "expense" || type === "purchase" || type === "supplier_payment";
}

export function sumSalesAndExpenses(rows: AmountRow[]): { sales: number; expenses: number; profit: number } {
  let sales = 0;
  let expenses = 0;
  for (const row of rows) {
    const amount = Number(row.amount);
    if (isMoneyIn(row.type)) sales += amount;
    else if (isMoneyOut(row.type)) expenses += amount;
  }
  return { sales, expenses, profit: sales - expenses };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return null;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function bucketDailySales(
  rows: (AmountRow & { occurred_at: string })[],
  from: Date,
  days: number,
): { label: string; sales: number }[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const row of rows) {
    if (!isMoneyIn(row.type)) continue;
    const key = row.occurred_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(row.amount));
    }
  }

  return [...buckets.entries()].map(([key, sales]) => {
    const d = new Date(key);
    const label = d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    return { label, sales };
  });
}
