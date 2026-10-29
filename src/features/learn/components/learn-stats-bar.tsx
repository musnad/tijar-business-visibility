"use client";

import { Flame, Gem, Heart } from "lucide-react";

import { levelFromXp, xpProgressInLevel } from "@/features/learn/learn-math";
import { useTranslation } from "@/lib/i18n/context";

export function LearnStatsBar({
  totalXp,
  streak,
  hearts,
}: {
  totalXp: number;
  streak: number;
  hearts: number;
}) {
  const { t } = useTranslation();
  const level = levelFromXp(totalXp);
  const { current, max } = xpProgressInLevel(totalXp);

  return (
    <div className="learn-stats-bar sticky top-0 z-20 -mx-4 mb-1 border-b border-primary/10 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm font-extrabold text-primary">
            <Flame className="size-5 fill-primary text-primary" />
            {streak}
          </span>
          <span className="flex items-center gap-1 text-sm font-extrabold text-primary">
            <Gem className="size-5 fill-secondary text-primary" />
            {totalXp}
          </span>
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart
                key={i}
                className={`size-4 ${i < hearts ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
              />
            ))}
          </span>
        </div>
        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
          {t("app.learn.level")} {level}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(current / max) * 100}%` }}
        />
      </div>
    </div>
  );
}
