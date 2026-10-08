import { TRANSACTION_TYPES } from "@/features/transactions/constants";
import type { TransactionType } from "@/features/transactions/constants";

export type ParsedImportRow = {
  type: TransactionType;
  amount: number;
  paymentMethod?: string;
  description?: string;
  occurredAt?: string;
};

export type ParseImportResult = {
  rows: ParsedImportRow[];
  errors: string[];
  format: "csv" | "text" | "word-html";
};

const TYPE_ALIASES: Record<string, TransactionType> = {
  sale: "sale",
  sales: "sale",
  expense: "expense",
  expenses: "expense",
  purchase: "purchase",
  customer_payment: "customer_payment",
  customerpayment: "customer_payment",
  "customer payment": "customer_payment",
  supplier_payment: "supplier_payment",
  supplierpayment: "supplier_payment",
  "supplier payment": "supplier_payment",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === "," || c === "\t") && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function mapRow(cells: string[], colIndex: Record<string, number>): ParsedImportRow | null {
  const typeRaw = (cells[colIndex.type] ?? cells[1] ?? "").trim().toLowerCase();
  const type = TYPE_ALIASES[typeRaw.replace(/\s+/g, "_")] ?? TYPE_ALIASES[typeRaw.replace(/_/g, " ")];
  if (!type || !TRANSACTION_TYPES.includes(type)) return null;

  const amountRaw = (cells[colIndex.amount] ?? cells[2] ?? "").replace(/,/g, "").trim();
  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const payment = (cells[colIndex.payment_method] ?? cells[colIndex.paymentmethod] ?? "").trim();
  const description = (cells[colIndex.description] ?? "").trim();
  const dateRaw = (cells[colIndex.date] ?? cells[colIndex.occurred_at] ?? "").trim();

  let occurredAt: string | undefined;
  if (dateRaw) {
    const d = new Date(dateRaw);
    if (!Number.isNaN(d.getTime())) occurredAt = d.toISOString();
  }

  return {
    type,
    amount,
    paymentMethod: payment || undefined,
    description: description || undefined,
    occurredAt,
  };
}

export function parseDelimitedText(text: string): ParseImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  if (lines.length === 0) {
    return { rows: [], errors: ["File is empty."], format: "text" };
  }

  const headerCells = parseCsvLine(lines[0]!);
  const colIndex: Record<string, number> = {};
  headerCells.forEach((h, i) => {
    colIndex[normalizeHeader(h)] = i;
  });

  const hasHeader =
    normalizeHeader(headerCells[0] ?? "") === "date" ||
    normalizeHeader(headerCells[0] ?? "") === "type" ||
    headerCells.some((h) => normalizeHeader(h) === "amount");

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: ParsedImportRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const cells = parseCsvLine(dataLines[i]!);
    const row = mapRow(cells, colIndex);
    if (row) rows.push(row);
    else errors.push(`Row ${i + (hasHeader ? 2 : 1)}: could not read type and amount.`);
  }

  return { rows, errors, format: "csv" };
}

function extractTextFromWordHtml(html: string): string {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return html.replace(/<[^>]+>/g, "\n");
  return tableMatch[0]!
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export async function parseImportFile(file: File): Promise<ParseImportResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return {
      rows: [],
      errors: ["PDF import is not supported. Export to CSV from your app, or use a CSV / Word table export."],
      format: "text",
    };
  }

  const text = await file.text();

  if (name.endsWith(".doc") || name.endsWith(".docx") || text.includes("<html") || text.includes("<table")) {
    const plain = extractTextFromWordHtml(text);
    const result = parseDelimitedText(plain);
    return { ...result, format: "word-html" };
  }

  return parseDelimitedText(text);
}
