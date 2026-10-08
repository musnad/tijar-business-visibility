"use client";

import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

export function LearnGrowBanner() {
  const { t } = useTranslation();

  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <GraduationCap className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t("app.dashboard.learnTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("app.dashboard.learnBody")}</p>
      </div>
      <Button size="sm" className="shrink-0 rounded-full px-4" asChild>
        <Link to="/app/learn">{t("app.dashboard.learnCta")}</Link>
      </Button>
    </div>
  );
}
