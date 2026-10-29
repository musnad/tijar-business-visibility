"use client";

import { Link } from "@tanstack/react-router";
import { Activity, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import type { HealthBand } from "@/features/insights/compute-business-health";
import { useTranslation } from "@/lib/i18n/context";
import { dismissRecommendation } from "@/services/business-health-service";
import { cn } from "@/lib/utils";

const bandTone: Record<HealthBand, string> = {
  strong: "bg-primary/15 text-primary ring-emerald-200",
  stable: "bg-primary/10 text-primary ring-primary/30",
  watch: "bg-primary/10 text-foreground ring-primary/30",
  risk: "bg-red-100 text-red-800 ring-red-200",
};

export function HealthInsightsCard({
  businessId,
  healthScore,
  healthBand,
  recommendations,
}: {
  businessId: string;
  healthScore: number;
  healthBand: HealthBand;
  recommendations: {
    id: string;
    code: string;
    title: string;
    body: string;
    actionPath: string | null;
  }[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  async function dismiss(id: string) {
    if (!id.includes("-")) return;
    const { error } = await dismissRecommendation(id);
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ["business-health", businessId] });
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <div>
            <h2 className="font-bold">{t("app.health.title")}</h2>
            <p className="text-xs text-muted-foreground">{t("app.health.subtitle")}</p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
              bandTone[healthBand],
            )}
          >
            {t(`app.health.band.${healthBand}`)}
          </span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{healthScore}</p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("app.health.noRecommendations")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {recommendations.map((reco) => (
            <li
              key={reco.id}
              className="rounded-xl border border-border bg-muted/20 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{reco.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{reco.body}</p>
                  {reco.actionPath && (
                    <Button variant="link" className="mt-1 h-auto p-0 text-primary" asChild>
                      <Link to={reco.actionPath}>{t("app.health.recoCta")}</Link>
                    </Button>
                  )}
                </div>
                {reco.id.includes("-") && (
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
                    aria-label={t("app.health.dismiss")}
                    onClick={() => void dismiss(reco.id)}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
