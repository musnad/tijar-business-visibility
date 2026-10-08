"use client";

import { ArrowRight, Lightbulb, Sparkles, Store } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

export function LearnStepProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const { t } = useTranslation();
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="learn-step-progress space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
          {t("app.learn.step")} {current}/{total}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "learn-step-dot size-2 rounded-full transition-all duration-300",
                i < current ? "learn-step-dot-done scale-110" : i === current ? "learn-step-dot-active" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-primary/10">
        <div
          className="learn-step-bar h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function LearnStoryScene({
  paragraphKeys,
  sceneEmoji = "🏪",
  characterName,
  translate,
}: {
  paragraphKeys: string[];
  sceneEmoji?: string;
  characterName?: string;
  translate: (key: string) => string;
}) {
  return (
    <div className="learn-story-card overflow-hidden rounded-3xl border border-primary/15 shadow-md">
      <div className="learn-story-scene relative px-5 pb-4 pt-5">
        <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-white/20 blur-2xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/90 text-2xl shadow-sm">
            {sceneEmoji}
          </span>
          <div className="min-w-0 text-white">
            {characterName && (
              <p className="text-xs font-bold uppercase tracking-wide text-white/80">
                {translate("app.learn.storyScene")}
              </p>
            )}
            <p className="truncate text-lg font-extrabold">{characterName ?? translate("app.learn.yourShop")}</p>
          </div>
          <Store className="ml-auto size-8 shrink-0 text-white/70" strokeWidth={2} />
        </div>
      </div>
      <div className="space-y-3 bg-card p-5">
        {paragraphKeys.map((key, i) => {
          const text = translate(key);
          const amounts = text.match(/₦[\d,]+/g);
          const isTijarLine = /TIJAR/i.test(text) || (i === 1 && text.includes("?"));

          if (i === 0) {
            return (
              <div key={key} className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground">{highlightAmounts(text, amounts)}</p>
                {amounts?.[0] && (
                  <div className="learn-sales-chip inline-flex items-center gap-2 rounded-2xl px-4 py-2.5">
                    <span className="text-lg" aria-hidden>
                      💰
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary/80">
                        {translate("app.learn.todaySales")}
                      </p>
                      <p className="text-xl font-extrabold tabular-nums text-primary">{amounts[0]}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (isTijarLine) {
            return (
              <div key={key} className="learn-tijar-bubble flex gap-3 rounded-2xl border-2 border-primary/25 bg-primary/[0.06] p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                  T
                </span>
                <p className="text-sm font-semibold leading-relaxed text-foreground">{text}</p>
              </div>
            );
          }

          return (
            <p key={key} className="text-sm font-medium leading-relaxed text-muted-foreground">
              {text}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function highlightAmounts(text: string, amounts: RegExpMatchArray | null) {
  if (!amounts?.length) return text;
  const parts = text.split(/(₦[\d,]+)/g);
  return parts.map((part, i) =>
    part.startsWith("₦") ? (
      <strong key={i} className="font-extrabold text-primary">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export function LearnQuizPrompt({ children, label }: { children: ReactNode; label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="learn-quiz-card rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card to-primary/[0.04] p-5 shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
        <Sparkles className="size-3.5" />
        {label ?? t("app.learn.quizTime")}
      </p>
      <div className="text-base font-extrabold leading-snug text-foreground">{children}</div>
    </div>
  );
}

export function LearnInsightCard({ body }: { body: string }) {
  const { t } = useTranslation();
  return (
    <div className="learn-insight-card rounded-3xl border-2 border-secondary/40 bg-gradient-to-br from-secondary/15 to-primary/[0.06] p-5 shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-primary">
        <Lightbulb className="size-4 fill-amber-300 text-amber-600" />
        {t("app.learn.proTip")}
      </p>
      <p className="text-sm font-semibold leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

export function LearnOptionButton({
  letterIndex,
  label,
  disabled,
  selected,
  revealed,
  isCorrect,
  onClick,
}: {
  letterIndex: number;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  revealed?: boolean;
  isCorrect?: boolean;
  onClick: () => void;
}) {
  const letter = OPTION_LETTERS[letterIndex] ?? "?";
  let shell = "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] active:scale-[0.98]";
  if (revealed && isCorrect) shell = "border-primary bg-primary/10 ring-2 ring-primary/25 learn-option-correct";
  if (revealed && selected && !isCorrect) shell = "border-destructive/50 bg-destructive/10";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-all",
        shell,
        selected && !revealed && "border-primary/50 bg-primary/5",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black",
          revealed && isCorrect
            ? "bg-primary text-primary-foreground"
            : revealed && selected && !isCorrect
              ? "bg-destructive text-white"
              : "bg-muted text-foreground",
        )}
      >
        {letter}
      </span>
      <span className="text-sm font-semibold leading-snug">{label}</span>
    </button>
  );
}

export function LearnExplainCard({
  text,
  xp,
  correct,
}: {
  text: string;
  xp?: number;
  correct: boolean;
}) {
  const { t } = useTranslation();
  if (!text) return null;
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 text-sm leading-relaxed",
        correct
          ? "border-primary/30 bg-primary/[0.06] text-foreground"
          : "border-destructive/20 bg-destructive/5 text-muted-foreground",
      )}
    >
      {correct && xp != null && xp > 0 && (
        <p className="learn-xp-pop mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">
          +{xp} XP
        </p>
      )}
      {!correct && (
        <p className="mb-1 text-xs font-bold text-destructive">{t("app.learn.tryAgainHint")}</p>
      )}
      {text}
    </div>
  );
}

export function LearnContinueButton({ onClick, xpHint }: { onClick: () => void; xpHint?: number }) {
  const { t } = useTranslation();
  return (
    <div className="learn-continue-dock pt-2">
      <Button
        type="button"
        className="learn-continue-btn min-h-14 w-full rounded-2xl text-base font-extrabold shadow-lg"
        onClick={onClick}
      >
        {t("app.learn.continue")}
        {xpHint != null && xpHint > 0 && (
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">+{xpHint} XP</span>
        )}
        <ArrowRight className="ml-1 size-5" />
      </Button>
    </div>
  );
}
