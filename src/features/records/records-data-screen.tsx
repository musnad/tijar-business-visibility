"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { csvHeaderLine } from "@/features/records/export-row";
import {
  exportRecordsCsv,
  exportRecordsPdf,
  exportRecordsWord,
} from "@/features/records/export-records";
import { parseImportFile } from "@/features/records/parse-import-file";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { useTranslation } from "@/lib/i18n/context";
import { importTransactionRows } from "@/services/records-import-service";
import { listTransactionsForExport } from "@/services/transaction-service";
import { downloadText } from "@/utils/download-blob";

function FormatButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-12 flex-1 rounded-xl font-semibold"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="mr-2 size-4 shrink-0" />
      {label}
    </Button>
  );
}

export function RecordsDataScreen({
  businessId,
  profileId,
  businessName,
}: {
  businessId: string;
  profileId: string;
  businessName: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["export-transactions", businessId],
    queryFn: async () => {
      const result = await listTransactionsForExport(businessId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });

  async function runExport(kind: "csv" | "pdf" | "word") {
    if (rows.length === 0) {
      toast.message(t("app.records.emptyExport"));
      return;
    }
    setBusy(true);
    try {
      const title = t("app.records.exportTitle");
      if (kind === "csv") exportRecordsCsv(rows, businessName);
      else if (kind === "pdf") await exportRecordsPdf(rows, businessName, title);
      else exportRecordsWord(rows, businessName, title);
      toast.success(t("app.records.exportDone"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("app.errors.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const sample = `${csvHeaderLine()}
2026-01-15T10:00:00,sale,5000,NGN,cash,Rice sale,,,,
2026-01-15T11:00:00,expense,1200,NGN,cash,Transport,,,,`;
    downloadText(sample, "tijar-import-template.csv", "text/csv;charset=utf-8");
  }

  async function onFilePicked(file: File) {
    setBusy(true);
    try {
      const parsed = await parseImportFile(file);
      if (parsed.rows.length === 0) {
        toast.error(parsed.errors[0] ?? t("app.records.importNone"));
        return;
      }
      const result = await importTransactionRows(businessId, profileId, parsed.rows);
      await invalidateBusinessQueries(queryClient, businessId);
      await queryClient.invalidateQueries({ queryKey: ["export-transactions", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["all-transactions", businessId] });

      if (result.imported > 0) {
        toast.success(
          t("app.records.importSuccess")
            .replace("{count}", String(result.imported))
            .replace("{failed}", String(result.failed)),
        );
      }
      if (result.errors.length > 0 && result.imported === 0) {
        toast.error(result.errors[0] ?? t("app.records.importFailed"));
      }
      if (parsed.errors.length > 0 && result.imported > 0) {
        toast.message(t("app.records.importPartial"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("app.records.importFailed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mt-5 space-y-6 pb-8">
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-background p-4">
        <p className="text-sm font-bold">{t("app.records.heroTitle")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("app.records.heroHint")}</p>
        <p className="mt-2 text-xs font-semibold tabular-nums text-primary">
          {isLoading ? "…" : t("app.records.rowCount").replace("{count}", String(rows.length))}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-bold">{t("app.records.exportSection")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("app.records.exportHint")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <FormatButton
            icon={FileSpreadsheet}
            label="CSV"
            disabled={busy || isLoading}
            onClick={() => void runExport("csv")}
          />
          <FormatButton
            icon={FileText}
            label="PDF"
            disabled={busy || isLoading}
            onClick={() => void runExport("pdf")}
          />
          <FormatButton
            icon={Download}
            label="Word"
            disabled={busy || isLoading}
            onClick={() => void runExport("word")}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold">{t("app.records.importSection")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("app.records.importHint")}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.doc,.docx,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFilePicked(f);
          }}
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="min-h-12 flex-1 rounded-xl font-bold"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            {t("app.records.chooseFile")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 rounded-xl font-semibold"
            disabled={busy}
            onClick={downloadTemplate}
          >
            {t("app.records.downloadTemplate")}
          </Button>
        </div>
      </section>
    </div>
  );
}
