import type { TransactionListItem } from "@/types/database";
import { downloadBlob, downloadText } from "@/utils/download-blob";

import { rowsToCsv, toExportRow } from "./export-row";

export function exportRecordsCsv(rows: TransactionListItem[], businessName: string) {
  const exportRows = rows.map(toExportRow);
  const csv = rowsToCsv(exportRows);
  const safe = businessName.replace(/[^\w\-]+/g, "_").slice(0, 40) || "tijar";
  downloadText(csv, `${safe}-records.csv`, "text/csv;charset=utf-8");
}

export async function exportRecordsPdf(
  rows: TransactionListItem[],
  businessName: string,
  title: string,
) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 36);
  doc.setFontSize(10);
  doc.text(businessName, 40, 52);
  doc.text(`Exported ${new Date().toLocaleString()}`, 40, 66);

  const body = rows.map((r) => {
    const e = toExportRow(r);
    return [
      e.date.slice(0, 10),
      e.type,
      e.amount,
      e.paymentMethod,
      e.description.slice(0, 60),
      e.customer,
    ];
  });

  autoTable(doc, {
    startY: 78,
    head: [["Date", "Type", "Amount", "Payment", "Description", "Customer"]],
    body,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [0, 168, 83] },
  });

  const safe = businessName.replace(/[^\w\-]+/g, "_").slice(0, 40) || "tijar";
  doc.save(`${safe}-records.pdf`);
}

export function exportRecordsWord(
  rows: TransactionListItem[],
  businessName: string,
  title: string,
) {
  const exportRows = rows.map(toExportRow);
  const tableRows = exportRows
    .map(
      (e) =>
        `<tr><td>${escHtml(e.date)}</td><td>${escHtml(e.type)}</td><td>${escHtml(e.amount)}</td><td>${escHtml(e.paymentMethod)}</td><td>${escHtml(e.description)}</td><td>${escHtml(e.customer)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${escHtml(title)}</title></head>
<body>
<h1>${escHtml(title)}</h1>
<p><strong>${escHtml(businessName)}</strong> — ${escHtml(new Date().toLocaleString())}</p>
<table border="1" cellpadding="4" cellspacing="0">
<thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Payment</th><th>Description</th><th>Customer</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>
</body></html>`;

  const safe = businessName.replace(/[^\w\-]+/g, "_").slice(0, 40) || "tijar";
  downloadBlob(
    new Blob(["\ufeff", html], { type: "application/msword" }),
    `${safe}-records.doc`,
  );
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
