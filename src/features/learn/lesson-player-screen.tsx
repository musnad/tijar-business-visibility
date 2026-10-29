"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  BUSINESS_STARTER_BADGE,
  isBusinessBasicsComplete,
} from "@/features/learn/business-basics-lessons";
import { LearnLessonHero } from "@/features/learn/components/learn-lesson-hero";
import { LearnStepView } from "@/features/learn/components/learn-step-view";
import { LearnStatsBar } from "@/features/learn/components/learn-stats-bar";
import { findLesson } from "@/features/learn/catalog";
import { useTranslation } from "@/lib/i18n/context";
import {
  awardLearnBadge,
  completeLesson,
  fetchLearnProgress,
  loseHeart,
} from "@/services/learn-progress-service";

export function LessonPlayerScreen({
  profileId,
  lessonId,
  businessId,
}: {
  profileId: string;
  lessonId: string;
  businessId: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const found = findLesson(lessonId);

  const { data: progress } = useQuery({
    queryKey: ["learn-progress", profileId],
    queryFn: () => fetchLearnProgress(profileId),
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [finished, setFinished] = useState(false);
  const [levelBonus, setLevelBonus] = useState(false);

  if (!found) {
    return (
      <p className="mt-8 text-sm text-destructive">{t("app.learn.lessonNotFound")}</p>
    );
  }

  const { path, lesson } = found;
  const state = progress ?? {
    totalXp: 0,
    streakCount: 0,
    lastActivityDate: null,
    heartsRemaining: 5,
    heartsDate: new Date().toISOString().slice(0, 10),
    completedLessonIds: [],
    badges: [],
  };

  const alreadyDone = state.completedLessonIds.includes(lessonId);
  const steps = lesson.steps;
  const step = steps[stepIndex];

  if (state.heartsRemaining <= 0 && !alreadyDone) {
    return (
      <div className="mt-8 space-y-4 text-center">
        <p className="text-lg font-bold">{t("app.learn.outOfHearts")}</p>
        <p className="text-sm text-muted-foreground">{t("app.learn.outOfHeartsHint")}</p>
        <Button className="rounded-xl font-bold" asChild>
          <Link to="/app/learn">{t("app.learn.backToPath")}</Link>
        </Button>
      </div>
    );
  }

  async function finishLesson(totalSessionXp: number) {
    if (!alreadyDone) {
      const xp = lesson.xp + totalSessionXp;
      let next = await completeLesson(profileId, lessonId, xp, state);
      if (isBusinessBasicsComplete(next.completedLessonIds) && !next.badges.includes(BUSINESS_STARTER_BADGE)) {
        next = await awardLearnBadge(profileId, next, BUSINESS_STARTER_BADGE, 500);
        setLevelBonus(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["learn-progress", profileId] });
      toast.success(t("app.learn.lessonComplete").replace("{xp}", String(xp)));
    }
    setFinished(true);
  }

  function onStepComplete(bonusXp?: number) {
    const add = bonusXp ?? 0;
    const nextXp = sessionXp + add;
    if (stepIndex + 1 >= steps.length) {
      void finishLesson(nextXp);
      return;
    }
    setSessionXp(nextXp);
    setStepIndex((i) => i + 1);
  }

  async function onWrong() {
    await loseHeart(profileId, state);
    await queryClient.invalidateQueries({ queryKey: ["learn-progress", profileId] });
  }

  if (finished) {
    return (
      <div className="learn-complete-screen mt-6 space-y-6 text-center">
        <div className="learn-celebration mx-auto flex size-32 items-center justify-center rounded-full text-6xl">
          {levelBonus ? "🏆" : "🎉"}
        </div>
        <div className="learn-complete-card mx-auto max-w-sm rounded-3xl border border-primary/20 bg-card p-6 shadow-lg">
          <h2 className="text-2xl font-extrabold">
            {levelBonus ? t("app.learn.levelCompleteTitle") : t("app.learn.greatJob")}
          </h2>
          {levelBonus && (
            <p className="mt-2 text-sm font-semibold text-primary">{t("app.learn.businessStarterBadge")}</p>
          )}
          {!alreadyDone && (
            <p className="learn-xp-pop mt-3 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-extrabold text-foreground">
              +{lesson.xp + sessionXp} XP
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {t(path.titleKey)} · {t(lesson.titleKey)}
          </p>
        </div>
        <Button
          className="learn-continue-btn min-h-14 w-full max-w-sm rounded-2xl text-base font-extrabold shadow-lg"
          onClick={() => void navigate({ to: "/app/learn" })}
        >
          {t("app.learn.continuePath")}
        </Button>
      </div>
    );
  }

  if (!step) return null;

  const lessonIndex = path.lessons.findIndex((l) => l.id === lessonId) + 1;

  return (
    <div className="learn-player-page pb-10">
      <LearnStatsBar
        totalXp={state.totalXp}
        streak={state.streakCount}
        hearts={state.heartsRemaining}
      />
      <LearnLessonHero
        pathTitleKey={path.titleKey}
        lessonTitleKey={lesson.titleKey}
        lessonIndex={lessonIndex}
        totalLessons={path.lessons.length}
        sessionXp={sessionXp}
        lessonXp={lesson.xp}
      />
      <div className="learn-step-animate" key={stepIndex}>
        <LearnStepView
          key={stepIndex}
          step={step}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          businessId={businessId}
          onStepComplete={onStepComplete}
          onWrong={() => void onWrong()}
        />
      </div>
    </div>
  );
}
