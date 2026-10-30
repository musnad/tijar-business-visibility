"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  Check,
  Flame,
  Lock,
  NotebookPen,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { AppDownloadButtons } from "@/components/app-download";
import { HeroFeedPhone } from "@/components/hero-feed-phone";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

const QUEST_IDS = ["record", "learn", "understand", "verify"] as const;
type QuestId = (typeof QUEST_IDS)[number];

const QUEST_ICONS = {
  record: NotebookPen,
  learn: BookOpen,
  understand: TrendingUp,
  verify: BadgeCheck,
} as const;

const ACHIEVEMENT_IDS = ["firstSale", "streak3", "lessonMaster", "verifiedProfile"] as const;
const ACHIEVEMENT_ICONS = {
  firstSale: Star,
  streak3: Flame,
  lessonMaster: BookOpen,
  verifiedProfile: BadgeCheck,
} as const;

const QUIZ_ANSWER_IDS = ["a", "b", "c"] as const;

export function HeroGameStats() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2.5">
      <GameStat
        icon={Trophy}
        label={t("gamification.heroStats.businessLevel")}
        value={t("gamification.heroStats.levelValue")}
        accent
      />
      <GameStat
        icon={Zap}
        label={t("gamification.heroStats.totalXp")}
        value={t("gamification.heroStats.xpValue")}
      />
      <GameStat
        icon={Flame}
        label={t("gamification.heroStats.streak")}
        value={t("gamification.heroStats.streakValue")}
        hot
      />
    </div>
  );
}

function GameStat({
  icon: Icon,
  label,
  value,
  accent,
  hot,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  accent?: boolean;
  hot?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold",
        accent ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card",
        hot && "border-secondary/50 bg-secondary/15",
      )}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function BusinessQuestBoard() {
  const { t } = useTranslation();
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [flash, setFlash] = useState<string | null>(null);

  const quests = useMemo(
    () =>
      QUEST_IDS.map((id) => ({
        id,
        icon: QUEST_ICONS[id],
        title: t(`gamification.quests.${id}.title`),
        copy: t(`gamification.quests.${id}.copy`),
        xp: Number(t(`gamification.quests.${id}.xp`)),
      })),
    [t],
  );

  const totalXp = useMemo(
    () => quests.filter((q) => done.has(q.id)).reduce((sum, q) => sum + q.xp, 0),
    [done, quests],
  );
  const progress = Math.round((done.size / quests.length) * 100);
  const baseXp = Number(t("gamification.demoXpBase").replace(/,/g, ""));

  function completeQuest(id: QuestId, xp: number) {
    if (done.has(id)) return;
    setDone((prev) => new Set(prev).add(id));
    setFlash(`${t("gamification.questXpPrefix")}${xp}${t("gamification.questXpSuffix")}`);
    window.setTimeout(() => setFlash(null), 1400);
  }

  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28 lg:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {t("gamification.playJourney")}
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              {t("gamification.levelUp")}
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("gamification.questIntro")}</p>

            <div className="mt-8 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{t("gamification.journeyProgress")}</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-extrabold text-secondary-foreground">
                  <Zap className="size-4 text-primary" aria-hidden />
                  {baseXp + totalXp} {t("gamification.demoXpLabel")}
                </span>
                {flash && (
                  <span className="quest-xp-pop inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-foreground">
                    <Sparkles className="size-3.5" aria-hidden />
                    {flash}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {quests.map((quest, index) => {
              const completed = done.has(quest.id);
              const Icon = quest.icon;
              const locked = index > 0 && !done.has(quests[index - 1]!.id);

              return (
                <button
                  key={quest.id}
                  type="button"
                  disabled={locked || completed}
                  onClick={() => completeQuest(quest.id, quest.xp)}
                  className={cn(
                    "quest-card relative rounded-[1.25rem] border p-5 text-left transition-all",
                    completed
                      ? "border-primary/40 bg-primary/5"
                      : locked
                        ? "cursor-not-allowed border-border bg-muted/50 opacity-70"
                        : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="size-6 text-primary" strokeWidth={2} aria-hidden />
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                      {t("gamification.questXpPrefix")}
                      {quest.xp}
                      {t("gamification.questXpSuffix")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{quest.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{quest.copy}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
                    {completed ? (
                      <>
                        <Check className="size-4 text-primary" aria-hidden />
                        <span className="text-primary">{t("gamification.completed")}</span>
                      </>
                    ) : locked ? (
                      <>
                        <Lock className="size-3.5" aria-hidden />
                        <span className="text-muted-foreground">{t("gamification.unlockPrevious")}</span>
                      </>
                    ) : (
                      <span className="text-primary">{t("gamification.tapComplete")}</span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function InteractiveLandingQuiz() {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string | null>(null);
  const correct = "b";
  const won = picked === correct;

  return (
    <div className="rounded-[1.25rem] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            {t("gamification.dailyChallenge")}
          </p>
          <h3 className="mt-2 text-2xl font-extrabold">{t("gamification.quizTitle")}</h3>
        </div>
        <span className="rounded-full border border-secondary/40 bg-secondary/20 px-3 py-1.5 text-xs font-extrabold text-secondary-foreground">
          {t("common.xpReward")}
        </span>
      </div>

      <p className="mt-6 text-lg leading-8">{t("gamification.quizQuestion")}</p>

      <div className="mt-5 grid gap-3">
        {QUIZ_ANSWER_IDS.map((answerId) => {
          const selected = picked === answerId;
          const showResult = picked !== null;
          const isCorrect = answerId === correct;

          return (
            <button
              key={answerId}
              type="button"
              onClick={() => setPicked(answerId)}
              disabled={picked !== null}
              className={cn(
                "rounded-xl border p-4 text-left font-semibold transition-colors",
                !showResult && "hover:border-primary/40 hover:bg-accent/50",
                showResult && isCorrect && "border-primary bg-primary/10 text-primary",
                showResult && selected && !isCorrect && "border-destructive/40 bg-destructive/5",
                showResult && !selected && !isCorrect && "opacity-60",
              )}
            >
              {t(`gamification.quizAnswers.${answerId}`)}
              {showResult && isCorrect && (
                <Check className="ms-2 inline size-5 align-text-bottom" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm font-semibold">
            {won ? (
              <span className="text-primary">{t("gamification.quizCorrect")}</span>
            ) : (
              <span>{t("gamification.quizWrong")}</span>
            )}
          </p>
          {!won && (
            <Button type="button" variant="outline" size="sm" onClick={() => setPicked(null)}>
              {t("common.tryAgain")}
            </Button>
          )}
        </div>
      )}

      <p className="mt-5 text-xs text-muted-foreground">{t("common.demoOnly")}</p>
    </div>
  );
}

export function AchievementStrip() {
  const { t } = useTranslation();

  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACHIEVEMENT_IDS.map((id) => {
        const Icon = ACHIEVEMENT_ICONS[id];
        return (
          <div
            key={id}
            className="flex flex-col items-center rounded-xl border border-border bg-card px-3 py-4 text-center"
          >
            <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </div>
            <p className="mt-3 text-xs font-bold leading-snug">{t(`gamification.achievements.${id}`)}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-secondary-foreground">
              {t("common.badge")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function LandingDownloadCta() {
  const { t } = useTranslation();

  return (
    <section id="download-app" className="scroll-mt-20 px-4 py-14 sm:px-5 sm:py-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-[#0B1F4D] px-5 py-10 text-white sm:px-10 sm:py-14 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8FCB9B]">
              {t("download.mobileApp")}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">{t("download.heroTitle")}</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/80">
              {t("download.heroCopy")} {t("download.signupInApp")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-[#1F7A4D] font-extrabold">
                <Link to="/shop">{t("home.openForYou")}</Link>
              </Button>
              <AppDownloadButtons size="lg" theme="dark" />
            </div>
            <p className="mt-4 text-xs text-white/55">{t("download.storeLinksNote")}</p>
          </div>
          <HeroFeedPhone className="max-w-[240px] lg:justify-self-end" />
        </div>
      </div>
    </section>
  );
}
