"use client";

import { useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Check, Mic, Sparkles, Square, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/features/auth/auth-context";
import {
  DISCOVERY_CHANNEL_OPTIONS,
  GOAL_OPTIONS,
  MAX_GOALS,
  PAYMENT_METHOD_OPTIONS,
  REVENUE_MODEL_OPTIONS,
} from "@/features/onboarding/constants";
import {
  normalizeOnboardingAnswers,
  onboardingWizardSchema,
  type OnboardingWizardAnswers,
} from "@/features/onboarding/schemas";
import { speakText, useSpeechRecognition } from "@/features/translate/use-speech";
import { completeBusinessSetup, listBusinessCategories } from "@/services/business-service";
import { updateProfile } from "@/services/profile-service";
import type { BusinessCategory } from "@/types/database";
import {
  DISCOVERY_KEYWORDS,
  GOAL_KEYWORDS,
  LANG_TO_LOCALE,
  matchSpokenOption,
  matchSpokenOptions,
  MODEL_KEYWORDS,
  parseYesNo,
  PAYMENT_KEYWORDS,
  PROMPTS,
  VOICE_ONBOARDING_LANGS,
  type VoiceOnboardingLang,
} from "@/utils/voice-onboarding";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 12;

type Answers = Partial<OnboardingWizardAnswers>;

const LABELS: Record<string, Record<string, string>> = {
  retail: { English: "Sell products", Hausa: "Sayar da kaya", Swahili: "Kuuza bidhaa", Yoruba: "Ta ọja" },
  service: { English: "Services", Hausa: "Aiyuka", Swahili: "Huduma", Yoruba: "Iṣẹ" },
  food: { English: "Food", Hausa: "Abinci", Swahili: "Chakula", Yoruba: "Ounjẹ" },
  wholesale: { English: "Wholesale", Hausa: "Jumloli", Swahili: "Jumla", Yoruba: "Osunwon" },
  other: { English: "Other", Hausa: "Sauran", Swahili: "Nyingine", Yoruba: "Omiran" },
};

export function VoiceOnboardingScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [lang, setLang] = useState<VoiceOnboardingLang>("English");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ paymentMethods: [], discoveryChannels: [], goals: [], revenueModels: [] });
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [heard, setHeard] = useState("");
  const [textValue, setTextValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const { listen, stop, listening, supported } = useSpeechRecognition();
  const prompts = PROMPTS[lang];
  const spokenStepRef = useRef(-1);

  useEffect(() => {
    void listBusinessCategories().then(({ data }) => setCategories(data));
  }, []);

  const question = useMemo(() => {
    switch (step) {
      case 0: return prompts.welcome;
      case 1: return prompts.askName;
      case 2: return prompts.askCategory;
      case 3: return prompts.askLocation;
      case 4: return prompts.askModel;
      case 5: return prompts.askPayments;
      case 6: return prompts.askCredit;
      case 7: return prompts.askStock;
      case 8: return prompts.askStaff;
      case 9: return prompts.askDiscovery;
      case 10: return prompts.askGoals;
      case 11: return prompts.askIslamic;
      default: return prompts.review;
    }
  }, [step, prompts]);

  useEffect(() => {
    if (spokenStepRef.current === step) return;
    spokenStepRef.current = step;
    if (step === 0 && !welcomed) return;
    void speakText(question, lang);
  }, [step, question, lang, welcomed]);

  function next() {
    setHeard("");
    setTextValue("");
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function accept(patch: Answers, advance = true) {
    setAnswers((a) => ({ ...a, ...patch }));
    if (advance) next();
  }

  function handleTranscript(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setHeard(text);
    switch (step) {
      case 1:
        if (text.length >= 2) accept({ businessName: text });
        break;
      case 2: {
        const opts = categories.map((c) => ({ id: c.id, keywords: [c.name, c.slug.replace(/-/g, " ")] }));
        const m = matchSpokenOption(text, opts);
        if (m) accept({ categoryId: m.id });
        else void speakText(prompts.tapFallback, lang);
        break;
      }
      case 3:
        accept({ location: text });
        break;
      case 4: {
        const m = matchSpokenOption(text, MODEL_KEYWORDS);
        if (m) accept({ revenueModels: [m.id] });
        else void speakText(prompts.tapFallback, lang);
        break;
      }
      case 5: {
        const { matched, done } = matchSpokenOptions(text, PAYMENT_KEYWORDS);
        const merged = [...new Set([...(answers.paymentMethods ?? []), ...matched.map((m) => m.id)])];
        setAnswers((a) => ({ ...a, paymentMethods: merged }));
        if (done && merged.length > 0) next();
        break;
      }
      case 6: case 7: case 8: {
        const yn = parseYesNo(text);
        if (yn === null) { void speakText(prompts.tapFallback, lang); break; }
        if (step === 6) accept({ customerCredit: yn });
        if (step === 7) accept({ managesInventory: yn });
        if (step === 8) accept({ hasStaff: yn });
        break;
      }
      case 9: {
        const { matched, done } = matchSpokenOptions(text, DISCOVERY_KEYWORDS);
        const merged = [...new Set([...(answers.discoveryChannels ?? []), ...matched.map((m) => m.id)])];
        setAnswers((a) => ({ ...a, discoveryChannels: merged }));
        if (done && merged.length > 0) next();
        break;
      }
      case 10: {
        const { matched, done } = matchSpokenOptions(text, GOAL_KEYWORDS);
        const merged = [...new Set([...(answers.goals ?? []), ...matched.map((m) => m.id)])].slice(0, MAX_GOALS);
        setAnswers((a) => ({ ...a, goals: merged }));
        if (done && merged.length > 0) next();
        break;
      }
      case 11: {
        const yn = parseYesNo(text);
        if (yn === null) { void speakText(prompts.tapFallback, lang); break; }
        accept({ islamicMode: yn ? "yes" : "not_now" });
        break;
      }
      default:
        break;
    }
  }

  async function onMic() {
    try {
      const transcript = await listen(lang);
      if (transcript) handleTranscript(transcript);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.voiceOnboarding.voiceFailed"));
    }
  }

  async function createBusiness() {
    if (!profile) return;
    const parsed = onboardingWizardSchema.safeParse({
      ...answers,
      keepNotes: true,
      islamicMode: answers.islamicMode ?? "not_now",
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? t("app.voiceOnboarding.completeAllSteps"));
      return;
    }
    setCreating(true);
    await updateProfile(profile.id, {
      preferred_language: LANG_TO_LOCALE[lang],
      onboarding_status: "in_progress",
    });
    const { error } = await completeBusinessSetup(profile.id, normalizeOnboardingAnswers(parsed.data));
    setCreating(false);
    if (error) {
      toast.error(error);
      return;
    }
    void speakText(prompts.saved, lang);
    toast.success(prompts.saved);
    await refreshProfile();
    void navigate({ to: "/app" });
  }

  const progress = Math.round((step / TOTAL_STEPS) * 100);
  const categoryName = categories.find((c) => c.id === answers.categoryId)?.name;

  function chips<T extends { id: string }>(options: readonly T[], render: (o: T) => string, onPick: (o: T) => void, selected: string[]) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
              selected.includes(o.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
            )}
          >
            {render(o)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl pb-8">
      <section className="dashboard-summary-card mt-2 rounded-3xl p-5 text-primary-foreground shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-extrabold"><Sparkles className="size-5" /> {t("app.voiceOnboarding.title")}</p>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold ring-1 ring-white/25">
            {step === 0 ? t("app.voiceOnboarding.start") : t("app.voiceOnboarding.stepOf").replace("{step}", String(step)).replace("{total}", String(TOTAL_STEPS))}
          </span>
        </div>
        <Progress value={step === 0 ? 4 : progress} className="mt-3 bg-white/20" />
        <p className="mt-3 text-sm text-white/85">{t("app.voiceOnboarding.subtitle")}</p>
      </section>

      {step === 0 && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-extrabold">{t("app.voiceOnboarding.chooseLanguage")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {VOICE_ONBOARDING_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  "min-h-12 rounded-2xl border text-sm font-bold",
                  lang === l ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <Button
            type="button"
            className="mt-4 min-h-12 w-full rounded-2xl font-bold"
            onClick={() => { setWelcomed(true); void speakText(prompts.welcome, lang); next(); }}
          >
            <Volume2 className="mr-1.5 size-5" /> {t("app.voiceOnboarding.startWithVoice")}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t("app.voiceOnboarding.tapAnswersHint")}</p>
        </section>
      )}

      {step >= 1 && step <= TOTAL_STEPS - 1 && (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">{t("app.voiceOnboarding.tijarAsks")}</p>
              <p className="mt-0.5 text-lg font-bold leading-snug">{question}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {listening && <span className="absolute size-24 animate-ping rounded-full bg-primary/15" />}
              <button
                type="button"
                onClick={listening ? stop : onMic}
                disabled={!supported}
                aria-label={listening ? t("app.voiceOnboarding.stop") : t("app.voiceOnboarding.speakYourAnswer")}
                className={cn(
                  "relative flex size-20 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-50",
                  listening ? "bg-destructive" : "bg-primary",
                )}
              >
                {listening ? <Square className="size-7" /> : <Mic className="size-8" />}
              </button>
            </div>
            <p className="mt-3 text-sm font-semibold">{listening ? t("app.voiceOnboarding.listening") : supported ? t("app.voiceOnboarding.tapAndSpeak") : t("app.voiceOnboarding.voiceNotSupported")}</p>
            {heard && <p className="mt-2 w-full rounded-xl bg-muted/70 px-3 py-2 text-center text-sm"><span className="text-muted-foreground">{t("app.voiceOnboarding.youSaid")} </span>“{heard}”</p>}
          </div>

          <div className="mt-5 space-y-4 border-t border-border pt-4">
            {(step === 1 || step === 3) && (
              <div className="flex gap-2">
                <Input
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder={step === 1 ? t("app.voiceOnboarding.businessNamePlaceholder") : t("app.voiceOnboarding.townOrAreaPlaceholder")}
                  className="min-h-12 flex-1 rounded-xl text-base"
                />
                <Button type="button" className="min-h-12 rounded-xl font-bold" disabled={textValue.trim().length < 2} onClick={() => handleTranscript(textValue)}>
                  {t("app.voiceOnboarding.next")}
                </Button>
              </div>
            )}

            {step === 2 &&
              chips(categories, (c) => c.name, (c) => accept({ categoryId: c.id }), answers.categoryId ? [answers.categoryId] : [])}

            {step === 4 &&
              chips(REVENUE_MODEL_OPTIONS, (o) => LABELS[o.id]?.[lang] ?? o.id, (o) => accept({ revenueModels: [o.id] }), answers.revenueModels ?? [])}

            {step === 5 && (
              <>
                {chips(PAYMENT_METHOD_OPTIONS, (o) => o.id.replace("_", " "), (o) => {
                  const cur = answers.paymentMethods ?? [];
                  setAnswers((a) => ({ ...a, paymentMethods: cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id] }));
                }, answers.paymentMethods ?? [])}
                <Button type="button" className="min-h-11 rounded-xl font-bold" disabled={(answers.paymentMethods ?? []).length === 0} onClick={next}>{t("app.voiceOnboarding.done")}</Button>
              </>
            )}

            {(step === 6 || step === 7 || step === 8 || step === 11) && (
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" className="min-h-12 rounded-2xl font-bold" onClick={() => handleTranscript("yes")}>{t("app.voiceOnboarding.yes")}</Button>
                <Button type="button" variant="outline" className="min-h-12 rounded-2xl font-bold" onClick={() => handleTranscript("no")}>{t("app.voiceOnboarding.no")}</Button>
              </div>
            )}

            {step === 9 && (
              <>
                {chips(DISCOVERY_CHANNEL_OPTIONS, (o) => o.id.replace("_", " "), (o) => {
                  const cur = answers.discoveryChannels ?? [];
                  setAnswers((a) => ({ ...a, discoveryChannels: cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id] }));
                }, answers.discoveryChannels ?? [])}
                <Button type="button" className="min-h-11 rounded-xl font-bold" disabled={(answers.discoveryChannels ?? []).length === 0} onClick={next}>{t("app.voiceOnboarding.done")}</Button>
              </>
            )}

            {step === 10 && (
              <>
                {chips(GOAL_OPTIONS, (o) => o.id.replace(/_/g, " "), (o) => {
                  const cur = answers.goals ?? [];
                  setAnswers((a) => ({ ...a, goals: cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id].slice(0, MAX_GOALS) }));
                }, answers.goals ?? [])}
                <Button type="button" className="min-h-11 rounded-xl font-bold" disabled={(answers.goals ?? []).length === 0} onClick={next}>{t("app.voiceOnboarding.done")}</Button>
              </>
            )}
          </div>

          <button type="button" className="mt-4 text-sm font-semibold text-muted-foreground underline-offset-2 hover:underline" onClick={() => setStep((s) => Math.max(1, s - 1))}>
            ← {t("app.voiceOnboarding.back")}
          </button>
        </section>
      )}

      {step >= TOTAL_STEPS && (
        <section className="mt-4 overflow-hidden rounded-3xl border-2 border-primary/50 bg-card shadow-lg">
          <div className="bg-primary/5 px-5 py-4">
            <p className="flex items-center gap-2 font-extrabold"><BadgeCheck className="size-5 text-primary" /> {t("app.voiceOnboarding.reviewTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{prompts.review}</p>
          </div>
          <dl className="divide-y divide-border px-5 text-sm">
            {[
              [t("app.voiceOnboarding.reviewBusiness"), answers.businessName ?? "—"],
              [t("app.voiceOnboarding.reviewCategory"), categoryName ?? "—"],
              [t("app.voiceOnboarding.reviewLocation"), answers.location ?? "—"],
              [t("app.voiceOnboarding.reviewType"), (answers.revenueModels ?? []).join(", ") || "—"],
              [t("app.voiceOnboarding.reviewPayments"), (answers.paymentMethods ?? []).join(", ") || "—"],
              [t("app.voiceOnboarding.reviewGoals"), (answers.goals ?? []).join(", ") || "—"],
              [t("app.voiceOnboarding.reviewLanguage"), lang],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="px-5 pb-5">
            <Button type="button" className="min-h-12 w-full rounded-2xl text-base font-bold" disabled={creating} onClick={createBusiness}>
              <Check className="mr-1.5 size-5" /> {creating ? t("app.voiceOnboarding.creating") : t("app.voiceOnboarding.createMyBusiness")}
            </Button>
            <button type="button" className="mt-3 w-full text-center text-sm font-semibold text-muted-foreground" onClick={() => setStep(1)}>
              {t("app.voiceOnboarding.startAgain")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
