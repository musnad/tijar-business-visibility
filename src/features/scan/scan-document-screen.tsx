"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  FileScan,
  ImagePlus,
  Loader2,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { useTranslation } from "@/lib/i18n/context";
import { extractTextFromImage } from "@/lib/ocr/provider";
import { cn } from "@/lib/utils";
import { createTransaction } from "@/services/transaction-service";
import { formatNgn } from "@/utils/money";
import { parseScannedDocument, type ScanDraft } from "@/utils/scan-document";
import type { VoiceIntentType } from "@/utils/voice-intent";

const INTENT_OPTIONS: VoiceIntentType[] = [
  "sale",
  "expense",
  "purchase",
  "customer_payment",
  "supplier_payment",
];

const INTENT_LABEL_KEYS: Record<VoiceIntentType, string> = {
  sale: "app.assistant.intentSale",
  expense: "app.assistant.intentExpense",
  purchase: "app.assistant.intentPurchase",
  customer_payment: "app.assistant.intentCustomerPayment",
  supplier_payment: "app.assistant.intentSupplierPayment",
};

type Step = "pick" | "reading" | "review";

export function ScanDocumentScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data } = usePrimaryBusiness(profile?.id);
  const business = data?.business ?? null;
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("pick");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStep("pick");
    setProgress(0);
    setProgressLabel("");
    setOcrText("");
    setDraft(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error(t("app.scan.needImage"));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep("reading");
    setProgress(0);
    setProgressLabel(t("app.scan.reading"));

    try {
      const result = await extractTextFromImage(file, (p) => {
        setProgress(Math.round(p.progress * 100));
        setProgressLabel(
          p.status === "recognizing text" ? t("app.scan.reading") : t("app.scan.preparing"),
        );
      });
      const text = result.text.trim();
      setOcrText(text);
      const parsed = parseScannedDocument(text);
      // Default unclear docs to sale so Confirm can save after the user checks the amount.
      setDraft(parsed.intent === "unknown" ? { ...parsed, intent: "sale" } : parsed);
      setStep("review");
      if (!text) {
        toast.message(t("app.scan.noText"));
      } else if (parsed.amount === null) {
        toast.message(t("app.scan.needAmountHint"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.scan.failed"));
      reset();
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  }

  function updateDraft(patch: Partial<ScanDraft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const ok = next.intent !== "unknown" && next.amount !== null && next.amount > 0;
      next.confidence = ok ? "high" : "low";
      return next;
    });
  }

  async function confirmSave() {
    if (!draft || draft.intent === "unknown" || draft.amount === null || draft.amount <= 0) return;
    if (!business || !profile) {
      toast.error(t("app.assistant.finishBusinessFirst"));
      return;
    }
    setSaving(true);
    const { error } = await createTransaction(business.id, profile.id, {
      type: draft.intent,
      amount: draft.amount,
      description: draft.description || undefined,
      paymentMethod: "cash",
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("app.scan.saved"));
    invalidateBusinessQueries(queryClient, business.id);
    reset();
  }

  const canSave =
    !!draft &&
    draft.intent !== "unknown" &&
    draft.amount !== null &&
    draft.amount > 0 &&
    !!business &&
    !!profile;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 pb-8">
      <section className="dashboard-summary-card relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <FileScan className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold leading-tight">{t("app.scan.title")}</h2>
            <p className="text-xs text-white/75">{t("app.scan.subtitle")}</p>
          </div>
        </div>
        <p className="relative mt-3 text-sm leading-relaxed text-white/85">{t("app.scan.heroBody")}</p>
      </section>

      {step === "pick" && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-6 transition-colors hover:bg-primary/10"
            >
              <Camera className="size-8 text-primary" />
              <span className="text-sm font-bold">{t("app.scan.takePhoto")}</span>
              <span className="text-center text-xs text-muted-foreground">{t("app.scan.takePhotoHint")}</span>
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-6 transition-colors hover:bg-muted/70"
            >
              <ImagePlus className="size-8 text-muted-foreground" />
              <span className="text-sm font-bold">{t("app.scan.choosePhoto")}</span>
              <span className="text-center text-xs text-muted-foreground">{t("app.scan.choosePhotoHint")}</span>
            </button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            {t("app.scan.privacyNote")}
          </p>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPick}
          />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </section>
      )}

      {step === "reading" && (
        <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="mx-auto mb-4 max-h-48 rounded-2xl object-contain" />
          )}
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm font-semibold">{progressLabel}</p>
          <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{progress}%</p>
        </section>
      )}

      {step === "review" && draft && (
        <section className="overflow-hidden rounded-3xl border-2 border-primary/50 bg-card shadow-lg">
          <div className="flex items-center justify-between gap-2 bg-primary/5 px-5 py-3.5">
            <p className="font-extrabold">{t("app.scan.checkRecord")}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                draft.confidence === "high" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
              )}
            >
              {draft.confidence === "high" ? t("app.assistant.understoodClearly") : t("app.assistant.checkCarefully")}
            </span>
          </div>

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="max-h-40 w-full object-cover object-top" />
          )}

          <div className="space-y-4 px-5 py-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("app.scan.typeLabel")}
              </span>
              <select
                value={draft.intent === "unknown" ? "sale" : draft.intent}
                onChange={(e) => updateDraft({ intent: e.target.value as VoiceIntentType })}
                className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
              >
                {INTENT_OPTIONS.map((id) => (
                  <option key={id} value={id}>
                    {t(INTENT_LABEL_KEYS[id])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("app.scan.amountLabel")}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step="any"
                value={draft.amount ?? ""}
                onChange={(e) => {
                  const n = Number.parseFloat(e.target.value);
                  updateDraft({ amount: Number.isFinite(n) && n > 0 ? n : null });
                }}
                placeholder="0"
                className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-2xl font-extrabold tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
              />
              {draft.amount !== null && draft.amount > 0 && (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{formatNgn(draft.amount)}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("app.scan.detailsLabel")}
              </span>
              <input
                type="text"
                value={draft.description}
                onChange={(e) => updateDraft({ description: e.target.value.slice(0, 80) })}
                placeholder={t("app.scan.detailsPlaceholder")}
                className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            {ocrText && (
              <details className="rounded-xl bg-muted/50 px-3 py-2 text-xs">
                <summary className="cursor-pointer font-semibold text-muted-foreground">
                  {t("app.scan.rawText")}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-foreground/80">{ocrText}</p>
              </details>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                className="min-h-12 flex-1 rounded-2xl text-base font-bold shadow-md"
                disabled={!canSave || saving}
                onClick={() => void confirmSave()}
              >
                <Check className="mr-1.5 size-5" />
                {saving ? t("app.assistant.saving") : t("app.scan.confirmSave")}
              </Button>
              <Button type="button" variant="outline" className="min-h-12 rounded-2xl px-4" onClick={reset}>
                <X className="mr-1 size-4" /> {t("app.assistant.cancel")}
              </Button>
            </div>

            <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={reset}>
              <RotateCcw className="mr-1.5 size-4" /> {t("app.scan.scanAnother")}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> {t("app.assistant.nothingSaved")}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
