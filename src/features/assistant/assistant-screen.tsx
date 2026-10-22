"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Banknote,
  Check,
  ChevronRight,
  Mic,
  PackagePlus,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Square,
  Volume2,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { speakText, useSpeechRecognition } from "@/features/translate/use-speech";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { useTranslation } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { createTransaction, fetchPeriodAnalytics, fetchTodayTotals } from "@/services/transaction-service";
import { translateTextClient } from "@/services/translate-service";
import { buildExplanation, parseExplainRequest } from "@/utils/explain";
import { parseVoiceCommand, summarizeDraft, type ParsedVoiceCommand, type VoiceIntentType } from "@/utils/voice-intent";
import { formatNgn } from "@/utils/money";
import { cn } from "@/lib/utils";

const SPEAK_LANGS = ["English", "Hausa", "Swahili", "Yoruba"] as const;

/** Speech engines / NKENNE language names for each app locale (where supported). */
const LOCALE_TO_SPEAK_LANG: Partial<Record<Locale, string>> = {
  en: "English",
  ha: "Hausa",
  sw: "Swahili",
  yo: "Yoruba",
};

const INTENT_META: Record<VoiceIntentType, { labelKey: string; icon: typeof ShoppingBag; className: string }> = {
  sale: { labelKey: "app.assistant.intentSale", icon: ShoppingBag, className: "bg-emerald-100 text-emerald-800" },
  expense: { labelKey: "app.assistant.intentExpense", icon: Wallet, className: "bg-rose-100 text-rose-800" },
  purchase: { labelKey: "app.assistant.intentPurchase", icon: PackagePlus, className: "bg-sky-100 text-sky-800" },
  customer_payment: { labelKey: "app.assistant.intentCustomerPayment", icon: Banknote, className: "bg-teal-100 text-teal-800" },
  supplier_payment: { labelKey: "app.assistant.intentSupplierPayment", icon: ReceiptText, className: "bg-violet-100 text-violet-800" },
};

type ActivityItem = { id: number; label: string; amount: number; at: string };

export function AssistantScreen() {
  const { profile } = useAuth();
  const { t, locale } = useTranslation();
  const { data } = usePrimaryBusiness(profile?.id);
  const business = data?.business ?? null;
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [speakLang, setSpeakLang] = useState<string>("English");
  const [speakReplies, setSpeakReplies] = useState(true);
  const [draft, setDraft] = useState<ParsedVoiceCommand | null>(null);
  const [reply, setReply] = useState<string>("");
  const [heard, setHeard] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const { listen, stop, listening, supported } = useSpeechRecognition();

  // Voice follows the app language whenever the device supports it.
  useEffect(() => {
    const mapped = LOCALE_TO_SPEAK_LANG[locale];
    if (mapped) setSpeakLang(mapped);
  }, [locale]);

  const examples: { textKey: string; intent: VoiceIntentType; icon: typeof ShoppingBag }[] = [
    { textKey: "app.assistant.exampleSale", intent: "sale", icon: ShoppingBag },
    { textKey: "app.assistant.exampleExpense", intent: "expense", icon: Wallet },
    { textKey: "app.assistant.exampleProfit", intent: "sale", icon: Sparkles },
    { textKey: "app.assistant.exampleToday", intent: "sale", icon: Banknote },
  ];

  function say(text: string) {
    setReply(text);
    if (speakReplies) speakText(text, speakLang);
  }

  async function explain(metric: NonNullable<ReturnType<typeof parseExplainRequest>>, original: string) {
    void original;
    if (!business) {
      say(t("app.assistant.needBusinessReply"));
      return;
    }
    say(t("app.assistant.checkingReply"));
    const [period, today] = await Promise.all([
      fetchPeriodAnalytics(business.id, 30),
      fetchTodayTotals(business.id),
    ]);
    const english = buildExplanation(metric, {
      sales30: period.current.sales,
      expenses30: period.current.expenses,
      profit30: period.current.profit,
      salesToday: today.sales,
      expensesToday: today.expenses,
      customerCreditTotal: null,
      healthScore: null,
    });
    if (speakLang === "English") {
      say(english);
      return;
    }
    // Translate the grounded explanation; Hausa is not in the documented
    // NKENNEAi API, so fall back to English honestly.
    if (speakLang === "Yoruba" || speakLang === "Swahili") {
      const translated = await translateTextClient({ text: english, fromLanguage: "English", toLanguage: speakLang });
      say(translated.ok ? translated.translatedText : english);
      return;
    }
    say(english);
  }

  function summaryStrings() {
    return {
      unknown: t("app.assistant.summaryUnknown"),
      text: t("app.assistant.summaryText"),
      labels: {
        sale: t("app.assistant.intentSale"),
        expense: t("app.assistant.intentExpense"),
        purchase: t("app.assistant.intentPurchase"),
        customer_payment: t("app.assistant.intentCustomerPayment"),
        supplier_payment: t("app.assistant.intentSupplierPayment"),
      } as Record<VoiceIntentType, string>,
    };
  }

  function understand(text: string) {
    const metric = parseExplainRequest(text);
    if (metric) {
      setDraft(null);
      void explain(metric, text);
      return;
    }
    const cmd = parseVoiceCommand(text);
    setDraft(cmd);
    say(summarizeDraft(cmd, summaryStrings()));
  }

  async function onMic() {
    try {
      const transcript = await listen(speakLang);
      if (transcript) {
        setHeard(transcript);
        setInput(transcript);
        understand(transcript);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.assistant.voiceFailed"));
    }
  }

  async function confirmSave() {
    if (!draft || draft.intent === "unknown" || draft.amount === null || !business || !profile) return;
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
      say(t("app.assistant.saveFailedReply"));
      return;
    }
    const meta = INTENT_META[draft.intent];
    const label = t(meta.labelKey);
    setActivity((prev) => [
      { id: Date.now(), label: `${label}${draft.description ? ` · ${draft.description}` : ""}`, amount: draft.amount!, at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) },
      ...prev,
    ]);
    toast.success(t("app.assistant.recordSaved"));
    say(t("app.assistant.savedReply").replace("{label}", label).replace("{amount}", formatNgn(draft.amount)));
    setDraft(null);
    setInput("");
    setHeard("");
    invalidateBusinessQueries(queryClient, business.id);
  }

  const draftMeta = draft && draft.intent !== "unknown" ? INTENT_META[draft.intent] : null;
  const DraftIcon = draftMeta?.icon ?? Sparkles;

  return (
    <div className="mx-auto max-w-xl pb-6">
      {/* Hero */}
      <section className="dashboard-summary-card relative mt-2 overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 size-36 rounded-full bg-black/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Sparkles className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold leading-tight">{t("app.assistant.title")}</h2>
              <p className="text-xs text-white/75">{t("app.assistant.subtitle")}</p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
              listening ? "bg-red-400/25 text-white ring-red-200/40" : "bg-white/15 text-white ring-white/25",
            )}
            aria-live="polite"
          >
            <span className={cn("size-1.5 rounded-full", listening ? "animate-pulse bg-red-300" : "bg-emerald-300")} />
            {listening ? t("app.assistant.listening") : t("app.assistant.ready")}
          </span>
        </div>
        <p className="relative mt-4 text-sm leading-relaxed text-white/85">{t("app.assistant.heroBody")}</p>
        {business && (
          <p className="relative mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/15 px-2.5 py-1 text-xs font-semibold text-white/90">
            <BadgeCheck className="size-3.5 shrink-0" />
            <span className="truncate">{business.business_name}</span>
          </p>
        )}
      </section>

      {/* Voice orb + composer */}
      <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            {listening && (
              <>
                <span className="absolute size-24 animate-ping rounded-full bg-primary/15" />
                <span className="absolute size-32 rounded-full bg-primary/5" />
              </>
            )}
            <button
              type="button"
              onClick={listening ? stop : onMic}
              disabled={!supported}
              aria-label={listening ? t("app.assistant.stopListening") : t("app.assistant.startListening")}
              className={cn(
                "relative flex size-20 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-50",
                listening ? "bg-destructive shadow-destructive/30" : "bg-primary shadow-primary/30 hover:shadow-primary/40",
              )}
            >
              {listening ? <Square className="size-7" /> : <Mic className="size-8" />}
            </button>
          </div>

          {listening ? (
            <div className="mt-4 flex h-6 items-end gap-1" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span
                  key={i}
                  className="w-1.5 animate-pulse rounded-full bg-primary"
                  style={{ height: `${10 + ((i * 7) % 14)}px`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          ) : null}

          <p className="mt-3 text-center text-sm font-semibold">
            {listening ? t("app.assistant.listeningNow") : supported ? t("app.assistant.tapMic") : t("app.assistant.unsupported")}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {supported ? t("app.assistant.micHint") : t("app.assistant.typingWorks")}
          </p>

          {heard && !listening && (
            <p className="mt-3 w-full rounded-xl bg-muted/70 px-3 py-2 text-center text-sm">
              <span className="text-muted-foreground">{t("app.assistant.youSaid")} </span>“{heard}”
            </p>
          )}
        </div>

        <div className="mt-5 flex items-end gap-2 border-t border-border pt-4">
          <label htmlFor="assistant-input" className="sr-only">{t("app.assistant.inputLabel")}</label>
          <textarea
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("app.assistant.inputPlaceholder")}
            rows={2}
            className="min-h-12 flex-1 resize-none rounded-2xl border border-input bg-background px-3.5 py-3 text-base outline-none focus:ring-2 focus:ring-primary/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                e.preventDefault();
                understand(input);
              }
            }}
          />
          <Button
            type="button"
            className="size-12 shrink-0 rounded-2xl shadow-md"
            disabled={!input.trim()}
            onClick={() => understand(input)}
            aria-label={t("app.assistant.understand")}
          >
            <Send className="size-5" />
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("app.assistant.speakLanguage")}</span>
            <select
              value={speakLang}
              onChange={(e) => setSpeakLang(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
            >
              {SPEAK_LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("app.assistant.voiceReplies")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={speakReplies}
              onClick={() => setSpeakReplies((v) => !v)}
              className={cn(
                "flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold transition-colors",
                speakReplies ? "border-primary/40 bg-primary/5 text-primary" : "border-input text-muted-foreground",
              )}
            >
              <span className="flex items-center gap-2"><Volume2 className="size-4" /> {t("app.assistant.speakReplies")}</span>
              <span className={cn("relative h-6 w-11 rounded-full transition-colors", speakReplies ? "bg-primary" : "bg-muted-foreground/30")}>
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", speakReplies ? "left-[1.375rem]" : "left-0.5")} />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("app.assistant.trySaying")}</h3>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {examples.map((ex) => {
            const Icon = ex.icon;
            const text = t(ex.textKey);
            return (
              <button
                key={ex.textKey}
                type="button"
                onClick={() => { setInput(text); setHeard(""); understand(text); }}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", INTENT_META[ex.intent].className)}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">“{text}”</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </section>

      {/* TIJAR reply */}
      {reply && (
        <section className="mt-5 flex gap-3" aria-live="polite">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-primary/20 bg-primary/5 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">TIJAR</p>
            <p className="mt-1 text-[15px] leading-relaxed">{reply}</p>
            <button
              type="button"
              onClick={() => speakText(reply, speakLang)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/25"
            >
              <Volume2 className="size-3.5" /> {t("app.assistant.hearIt")}
            </button>
          </div>
        </section>
      )}

      {/* Draft confirmation */}
      {draft && draftMeta && draft.amount !== null && (
        <section className="mt-5 overflow-hidden rounded-3xl border-2 border-primary/50 bg-card shadow-lg">
          <div className="flex items-center justify-between gap-2 bg-primary/5 px-5 py-3.5">
            <p className="flex items-center gap-2 font-extrabold">
              <ReceiptText className="size-5 text-primary" /> {t("app.assistant.checkRecord")}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                draft.confidence === "high" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
              )}
            >
              {draft.confidence === "high" ? t("app.assistant.understoodClearly") : t("app.assistant.checkCarefully")}
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={cn("flex size-12 items-center justify-center rounded-2xl", draftMeta.className)}>
                <DraftIcon className="size-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(draftMeta.labelKey)}</p>
                <p className="text-3xl font-extrabold tabular-nums leading-none">{formatNgn(draft.amount)}</p>
              </div>
            </div>
            <dl className="mt-4 divide-y divide-border rounded-2xl bg-muted/50 text-sm">
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-muted-foreground">{t("app.assistant.details")}</dt>
                <dd className="text-right font-semibold">{draft.description || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-muted-foreground">{t("app.assistant.payment")}</dt>
                <dd className="font-semibold">{t("app.assistant.cash")}</dd>
              </div>
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-muted-foreground">{t("app.assistant.business")}</dt>
                <dd className="text-right font-semibold">{business?.business_name ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <Button type="button" className="min-h-12 flex-1 rounded-2xl text-base font-bold shadow-md" disabled={saving || !business} onClick={confirmSave}>
                <Check className="mr-1.5 size-5" /> {saving ? t("app.assistant.saving") : t("app.assistant.confirmSave")}
              </Button>
              <Button type="button" variant="outline" className="min-h-12 rounded-2xl px-4" onClick={() => setDraft(null)}>
                <X className="mr-1 size-4" /> {t("app.assistant.cancel")}
              </Button>
            </div>
            {!business && <p className="mt-2 text-xs font-semibold text-destructive">{t("app.assistant.finishBusinessFirst")}</p>}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> {t("app.assistant.nothingSaved")}
            </p>
          </div>
        </section>
      )}

      {/* Session activity */}
      {activity.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("app.assistant.savedThisSession")}</h3>
          <ul className="mt-2.5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {activity.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.label}</span>
                <span className="text-sm font-extrabold tabular-nums">{formatNgn(item.amount)}</span>
                <span className="text-xs text-muted-foreground">{item.at}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
