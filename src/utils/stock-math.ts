export function isLowStock(stockQuantity: number, threshold: number): boolean {
  return stockQuantity <= threshold;
}

export function inventoryValue(stockQuantity: number, costPrice: number | null): number {
  if (costPrice == null || Number.isNaN(costPrice)) return 0;
  return stockQuantity * costPrice;
}

export function parseQuantity(raw: string): number | null {
  const v = raw.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,3})?$/.test(v)) return null;
  const n = Number.parseFloat(v);
  return n > 0 ? n : null;
}
