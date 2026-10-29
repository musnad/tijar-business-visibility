import { downloadText } from "@/utils/download-blob";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function downloadAdminCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  downloadText(`\uFEFF${lines.join("\n")}`, filename, "text/csv;charset=utf-8");
}
