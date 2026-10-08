import type { ProductKind } from "@/types/database";

export function unitCost(product: {
  kind: ProductKind;
  cost_price: number | null;
}): number {
  const c = product.cost_price != null ? Number(product.cost_price) : 0;
  return c >= 0 ? c : 0;
}

export function saleLineTotals(
  unitPrice: number,
  costPerUnit: number,
  quantity: number,
): { revenue: number; cost: number; profit: number } {
  const q = quantity > 0 ? quantity : 1;
  const revenue = unitPrice * q;
  const cost = costPerUnit * q;
  return { revenue, cost, profit: revenue - cost };
}

export function formatProfitLabel(profit: number): "profit" | "loss" | "even" {
  if (profit > 0) return "profit";
  if (profit < 0) return "loss";
  return "even";
}
