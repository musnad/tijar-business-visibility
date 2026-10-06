"use client";

import type { CSSProperties } from "react";
import { BadgeCheck, TrendingUp } from "lucide-react";
import { TijarLogo } from "@/components/brand-logo";
import { useTranslation } from "@/lib/i18n/context";

const growthHeights = ["38%", "58%", "82%"] as const;

export function HeroLogoShowcase() {
  const { t } = useTranslation();

  return (
    <div className="hero-logo-stage w-full max-w-[min(100%,22rem)] sm:max-w-md">
      <div className="hero-logo-glow pointer-events-none" aria-hidden />

      <div className="hero-logo-frame relative">
        <div className="hero-logo-ring" aria-hidden>
          <div className="hero-logo-ring-spin" />
        </div>

        <div className="hero-logo-card relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_24px_60px_-28px_oklch(0.28_0.07_258_/_0.45)] backdrop-blur-sm sm:p-7">
          <div className="hero-logo-shimmer pointer-events-none" aria-hidden />
          <TijarLogo className="hero-logo-image relative z-10 max-w-none" />

          <div
            className="hero-growth-bars pointer-events-none absolute bottom-4 end-4 flex items-end gap-1.5 sm:bottom-5 sm:end-5"
            aria-hidden
          >
            {growthHeights.map((height, index) => (
              <span
                key={height}
                className="hero-growth-bar w-2 origin-bottom rounded-sm bg-gradient-to-t from-primary to-secondary sm:w-2.5"
                style={
                  {
                    "--bar-height": height,
                    "--bar-delay": `${0.85 + index * 0.12}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <div
          className="hero-logo-badge hero-logo-badge--left hidden min-[420px]:inline-flex"
          aria-hidden
        >
          <TrendingUp className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
          <span>{t("hero.growing")}</span>
        </div>
        <div
          className="hero-logo-badge hero-logo-badge--right hidden min-[420px]:inline-flex"
          aria-hidden
        >
          <BadgeCheck className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
          <span>{t("hero.visible")}</span>
        </div>
      </div>

      <div className="brand-accent-line hero-accent-line mt-8" aria-hidden />
    </div>
  );
}
