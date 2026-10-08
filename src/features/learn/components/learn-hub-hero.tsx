"use client";

import { BookOpen, Gamepad2, HandCoins, Sparkles, Target } from "lucide-react";

import { levelFromXp } from "@/features/learn/learn-math";
import { useTranslation } from "@/lib/i18n/context";

const LOOP_STEPS = [
  { key: "learn", icon: BookOpen },
  { key: "play", icon: Gamepad2 },
  { key: "decide", icon: Target },
  { key: "do", icon: HandCoins },
] as const;

export function LearnHubHero({ totalXp }: { totalXp: number }) {
  const { t } = useTranslation();
  const level = levelFromXp(totalXp);

  return (
    <header className="learn-hub-hero relative overflow-hidden rounded-3xl border border-primary/15 px-5 pb-5 pt-5 shadow-md">
      <div className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-secondary/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -right-8 size-44 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/90">
              {t("app.learn.hubEyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">{t("app.learn.title")}</h1>
          </div>
          <div className="learn-hub-level-badge flex shrink-0 flex-col items-center rounded-2xl px-3 py-2">
            <span className="text-[10px] font-bold uppercase text-primary/80">{t("app.learn.level")}</span>
            <span className="text-2xl font-black tabular-nums leading-none text-primary">{level}</span>
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap items-center gap-1.5">
          {LOOP_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.key} className="flex items-center gap-1.5">
                <span className="learn-loop-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold">
                  <Icon className="size-3.5 shrink-0 opacity-80" strokeWidth={2.5} />
                  {t(`app.learn.loop.${step.key}`)}
                </span>
                {i < LOOP_STEPS.length - 1 && (
                  <span className="text-xs font-bold text-primary/40" aria-hidden>
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <p className="learn-hub-earn mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold">
          <Sparkles className="size-3.5" />
          {t("app.learn.loop.earn")}
        </p>
      </div>
    </header>
  );
}
