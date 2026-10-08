import type { TransactionListItem } from "@/types/database";

export type RecordExportRow = {
  date: string;
  type: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  description: string;
  customer: string;
  supplier: string;
  product: string;
  quantity: string;
  lineProfit: string;
};

export function toExportRow(row: TransactionListItem): RecordExportRow {
  return {
    date: row.occurred_at.slice(0, 19),
    type: row.type,
    amount: String(row.amount),
    currency: row.currency ?? "NGN",
    paymentMethod: row.payment_method ?? "",
    description: row.description ?? "",
    customer: row.customers?.name ?? "",
    supplier: row.suppliers?.name ?? "",
    product: row.products?.name ?? "",
    quantity: row.quantity != null ? String(row.quantity) : "",
    lineProfit: row.line_profit != null ? String(row.line_profit) : "",
  };
}

export const CSV_HEADERS: (keyof RecordExportRow)[] = [
  "date",
  "type",
  "amount",
  "currency",
  "paymentMethod",
  "description",
  "customer",
  "supplier",
  "product",
  "quantity",
  "lineProfit",
];

export function csvHeaderLine(): string {
  return [
    "date",
    "type",
    "amount",
    "currency",
    "payment_method",
    "description",
    "customer",
    "supplier",
    "product",
    "quantity",
    "line_profit",
  ].join(",");
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: RecordExportRow[]): string {
  const lines = [csvHeaderLine()];
  for (const r of rows) {
    lines.push(
      [
        r.date,
        r.type,
        r.amount,
        r.currency,
        r.paymentMethod,
        r.description,
        r.customer,
        r.supplier,
        r.product,
        r.quantity,
        r.lineProfit,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return lines.join("\n");
}
