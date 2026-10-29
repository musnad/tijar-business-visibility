"use client";

import { Link } from "@tanstack/react-router";
import { Check, Lock, Play, Star } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LessonNode({
  lessonId,
  title,
  xp,
  status,
  offset,
  lessonNumber,
}: {
  lessonId: string;
  title: string;
  xp: number;
  status: "locked" | "available" | "completed" | "current";
  offset: "left" | "center" | "right";
  lessonNumber: number;
}) {
  const { t } = useTranslation();
  const align =
    offset === "left" ? "mr-auto ml-2" : offset === "right" ? "ml-auto mr-2" : "mx-auto";

  const inner = (
    <div className={cn("flex w-[min(100%,14rem)] flex-col items-center gap-2", align)}>
      {status === "current" && (
        <span className="learn-node-start rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wide">
          {t("app.learn.startHere")}
        </span>
      )}
      <div
        className={cn(
          "relative flex size-[4.5rem] items-center justify-center rounded-full border-4 shadow-lg transition-transform",
          status === "completed" && "border-primary/40 bg-primary text-primary-foreground shadow-primary/20",
          status === "current" && "learn-node-current border-secondary bg-gradient-to-b from-primary/20 to-card ring-4 ring-secondary/40",
          status === "available" && "border-primary/35 bg-card hover:scale-105 active:scale-95",
          status === "locked" && "border-muted-foreground/20 bg-muted/40 text-muted-foreground shadow-none",
        )}
      >
        <span
          className={cn(
            "absolute -left-0.5 -top-0.5 flex size-6 items-center justify-center rounded-full text-[10px] font-black",
            status === "locked" ? "bg-muted text-muted-foreground" : "bg-foreground text-background",
          )}
        >
          {lessonNumber}
        </span>
        {status === "completed" && <Check className="size-8 stroke-[3]" />}
        {status === "locked" && <Lock className="size-6" />}
        {status === "current" && <Play className="size-7 fill-primary text-primary" />}
        {status === "available" && <Star className="size-7 text-primary" />}
        <span className="absolute -bottom-1.5 rounded-full bg-gradient-to-r from-primary/15 to-accent px-2 py-0.5 text-[10px] font-bold text-foreground shadow-sm">
          +{xp}
        </span>
      </div>
      <p
        className={cn(
          "max-w-[10rem] text-center text-xs font-bold leading-tight",
          status === "locked" ? "text-muted-foreground" : "text-foreground",
          status === "current" && "text-primary",
        )}
      >
        {title}
      </p>
    </div>
  );

  if (status === "locked") {
    return <div className="relative z-10 opacity-75">{inner}</div>;
  }

  return (
    <Link
      to="/app/learn/$lessonId"
      params={{ lessonId }}
      className="relative z-10 block touch-manipulation"
    >
      {inner}
    </Link>
  );
}
