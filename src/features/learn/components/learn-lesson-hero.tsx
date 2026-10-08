"use client";

import { Sparkles } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

export function LearnLessonHero({
  pathTitleKey,
  lessonTitleKey,
  lessonIndex,
  totalLessons,
  sessionXp,
  lessonXp,
}: {
  pathTitleKey: string;
  lessonTitleKey: string;
  lessonIndex: number;
  totalLessons: number;
  sessionXp: number;
  lessonXp: number;
}) {
  const { t } = useTranslation();

  return (
    <header className="learn-lesson-hero relative mb-5 overflow-hidden rounded-3xl border border-primary/15 px-5 py-4 shadow-sm">
      <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-secondary/30 blur-3xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {t(pathTitleKey)} · {t("app.learn.lessonOf").replace("{n}", String(lessonIndex)).replace("{total}", String(totalLessons))}
          </p>
          <h1 className="mt-1 text-xl font-extrabold leading-tight tracking-tight text-foreground">
            {t(lessonTitleKey)}
          </h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="learn-xp-badge inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold">
            <Sparkles className="size-3.5" />
            +{lessonXp} XP
          </span>
          {sessionXp > 0 && (
            <span className="text-[10px] font-bold tabular-nums text-primary">
              {t("app.learn.sessionXp").replace("{xp}", String(sessionXp))}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
