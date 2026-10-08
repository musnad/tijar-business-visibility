const ngn = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatNgn(amount: number): string {
  return ngn.format(amount);
}

/** Compact labels for charts and overview rows (e.g. ₦450k). */
export function formatNgnCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `₦${Math.round(amount / 1_000)}k`;
  }
  return formatNgn(amount);
}

export function sumAmounts(rows: { amount: number }[]): number {
  return rows.reduce((acc, row) => acc + row.amount, 0);
}
