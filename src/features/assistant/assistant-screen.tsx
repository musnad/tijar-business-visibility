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
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { speakText, useSpeechRecognition } from "@/features/translate/use-speech";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { createTransaction } from "@/services/transaction-service";
import { parseVoiceCommand, summarizeDraft, type ParsedVoiceCommand, type VoiceIntentType } from "@/utils/voice-intent";
import { formatNgn } from "@/utils/money";
import { cn } from "@/lib/utils";

const EXAMPLES: { text: string; intent: VoiceIntentType; icon: typeof ShoppingBag }[] = [
  { text: "Record sale 5000 for rice", intent: "sale", icon: ShoppingBag },
  { text: "Record expense 2000 transport", intent: "expense", icon: Wallet },
  { text: "I sold 2 bags of rice for 45000", intent: "sale", icon: Banknote },
  { text: "Bought stock 30000", intent: "purchase", icon: PackagePlus },
];

const SPEAK_LANGS = ["English", "Hausa", "Swahili", "Yoruba"] as const;

const INTENT_META: Record<VoiceIntentType, { label: string; icon: typeof ShoppingBag; className: string }> = {
  sale: { label: "Sale", icon: ShoppingBag, className: "bg-emerald-100 text-emerald-800" },
  expense: { label: "Expense", icon: Wallet, className: "bg-rose-100 text-rose-800" },
  purchase: { label: "Purchase · Stock", icon: PackagePlus, className: "bg-sky-100 text-sky-800" },
  customer_payment: { label: "Customer payment", icon: Banknote, className: "bg-teal-100 text-teal-800" },
  supplier_payment: { label: "Supplier payment", icon: ReceiptText, className: "bg-violet-100 text-violet-800" },
};

type ActivityItem = { id: number; label: string; amount: number; at: string };

export function AssistantScreen() {
  const { profile } = useAuth();
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

  function say(text: string) {
    setReply(text);
    if (speakReplies) speakText(text, speakLang);
  }

  function understand(text: string) {
    const cmd = parseVoiceCommand(text);
    setDraft(cmd);
    say(summarizeDraft(cmd));
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
      toast.error(err instanceof Error ? err.message : "Voice failed");
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
      say("Sorry, I could not save that. Please try again.");
      return;
    }
    const meta = INTENT_META[draft.intent];
    setActivity((prev) => [
      { id: Date.now(), label: `${meta.label}${draft.description ? ` · ${draft.description}` : ""}`, amount: draft.amount!, at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) },
      ...prev,
    ]);
    toast.success("Record saved.");
    say(`Saved. ${meta.label} of ${formatNgn(draft.amount)} has been recorded.`);
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
              <h2 className="text-lg font-extrabold leading-tight">Talk to TIJAR</h2>
              <p className="text-xs text-white/75">Your voice bookkeeper</p>
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
            {listening ? "Listening" : "Ready"}
          </span>
        </div>
        <p className="relative mt-4 text-sm leading-relaxed text-white/85">
          Say what happened in your shop — a sale, an expense, stock you bought — and TIJAR prepares the record for you.
        </p>
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
              aria-label={listening ? "Stop listening" : "Start voice input"}
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
            {listening ? "Listening… speak now" : supported ? "Tap the microphone and speak" : "Voice is not supported on this device"}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {supported ? "One short sentence works best — type, amount and what it was for." : "Typing below works fully."}
          </p>

          {heard && !listening && (
            <p className="mt-3 w-full rounded-xl bg-muted/70 px-3 py-2 text-center text-sm">
              <span className="text-muted-foreground">You said: </span>“{heard}”
            </p>
          )}
        </div>

        <div className="mt-5 flex items-end gap-2 border-t border-border pt-4">
          <label htmlFor="assistant-input" className="sr-only">Type a record</label>
          <textarea
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type instead… e.g. Record sale 5000 for rice"
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
            aria-label="Understand"
          >
            <Send className="size-5" />
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Speak language</span>
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
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Voice replies</span>
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
              <span className="flex items-center gap-2"><Volume2 className="size-4" /> Speak replies</span>
              <span className={cn("relative h-6 w-11 rounded-full transition-colors", speakReplies ? "bg-primary" : "bg-muted-foreground/30")}>
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", speakReplies ? "left-[1.375rem]" : "left-0.5")} />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Try saying</h3>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EXAMPLES.map((ex) => {
            const Icon = ex.icon;
            return (
              <button
                key={ex.text}
                type="button"
                onClick={() => { setInput(ex.text); setHeard(""); understand(ex.text); }}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", INTENT_META[ex.intent].className)}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">“{ex.text}”</span>
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
              <Volume2 className="size-3.5" /> Hear it
            </button>
          </div>
        </section>
      )}

      {/* Draft confirmation */}
      {draft && draftMeta && draft.amount !== null && (
        <section className="mt-5 overflow-hidden rounded-3xl border-2 border-primary/50 bg-card shadow-lg">
          <div className="flex items-center justify-between gap-2 bg-primary/5 px-5 py-3.5">
            <p className="flex items-center gap-2 font-extrabold">
              <ReceiptText className="size-5 text-primary" /> Check this record
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                draft.confidence === "high" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
              )}
            >
              {draft.confidence === "high" ? "Understood clearly" : "Please check carefully"}
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={cn("flex size-12 items-center justify-center rounded-2xl", draftMeta.className)}>
                <DraftIcon className="size-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{draftMeta.label}</p>
                <p className="text-3xl font-extrabold tabular-nums leading-none">{formatNgn(draft.amount)}</p>
              </div>
            </div>
            <dl className="mt-4 divide-y divide-border rounded-2xl bg-muted/50 text-sm">
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-muted-foreground">Details</dt>
                <dd className="text-right font-semibold">{draft.description || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-muted-foreground">Payment</dt>
                <dd className="font-semibold">Cash</dd>
              </div>
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-muted-foreground">Business</dt>
                <dd className="text-right font-semibold">{business?.business_name ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <Button type="button" className="min-h-12 flex-1 rounded-2xl text-base font-bold shadow-md" disabled={saving || !business} onClick={confirmSave}>
                <Check className="mr-1.5 size-5" /> {saving ? "Saving…" : "Confirm & save"}
              </Button>
              <Button type="button" variant="outline" className="min-h-12 rounded-2xl px-4" onClick={() => setDraft(null)}>
                <X className="mr-1 size-4" /> Cancel
              </Button>
            </div>
            {!business && <p className="mt-2 text-xs font-semibold text-destructive">Finish setting up your business first.</p>}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Nothing is saved until you confirm.
            </p>
          </div>
        </section>
      )}

      {/* Session activity */}
      {activity.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saved this session</h3>
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
