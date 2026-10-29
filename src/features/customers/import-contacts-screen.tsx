"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { extractContactsFromFile, type ExtractedContact } from "@/lib/imports/extract-contacts";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { importCustomers } from "@/services/customer-service";

export function ImportContactsScreen({ businessId }: { businessId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ExtractedContact[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setFileName(file.name);
    try {
      const result = await extractContactsFromFile(file);
      setRows(result.contacts);
      setWarning(result.warning);
      if (result.contacts.length === 0) toast.error(result.warning ?? "No contacts found.");
      else toast.success(`Found ${result.contacts.length} contact${result.contacts.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file.");
    }
    setBusy(false);
  }

  async function importNow() {
    if (rows.length === 0) return;
    setBusy(true);
    const { imported, error } = await importCustomers(businessId, rows);
    setBusy(false);
    if (imported === 0) {
      toast.error(error ?? "Import failed.");
      return;
    }
    toast.success(`Imported ${imported} customer${imported === 1 ? "" : "s"} into this business.`);
    await invalidateBusinessQueries(queryClient, businessId);
    void navigate({ to: "/app/customers" });
  }

  return (
    <div className="pb-8">
      <AppPageHeader
        title="Import contacts"
        subtitle="CSV, Excel or PDF. We extract name, email and phone into your customer list."
        action={<BackLinkButton to="/app/customers" label="Back" />}
      />

      <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-card px-4 py-6 text-center">
        <Upload className="size-8 text-primary" />
        <p className="mt-2 text-sm font-bold">Upload CSV, Excel or PDF</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Best: CSV with columns name, email, phone
        </p>
        {fileName && <p className="mt-2 text-xs font-semibold">{fileName}</p>}
        <input
          type="file"
          accept=".csv,.tsv,.xls,.xlsx,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>

      {warning && rows.length > 0 && (
        <p className="mt-3 text-xs text-amber-800">{warning}</p>
      )}

      {rows.length > 0 && (
        <>
          <h2 className="mt-5 text-sm font-bold">Preview ({rows.length})</h2>
          <ul className="mt-2 max-h-72 overflow-auto rounded-2xl border border-border bg-card">
            {rows.slice(0, 80).map((row, i) => (
              <li key={`${row.email}-${row.phone}-${i}`} className="border-b border-border px-3 py-2 last:border-b-0">
                <p className="text-sm font-semibold">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[row.email, row.phone].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="mt-4 min-h-12 w-full rounded-xl font-bold"
            disabled={busy}
            onClick={() => void importNow()}
          >
            <FileSpreadsheet className="mr-2 size-4" />
            Import into customers
          </Button>
        </>
      )}
    </div>
  );
}
