"use client";

import { APP_DASHBOARD_SRC } from "@/components/app-download";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

function DashboardScreen({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <img
      src={APP_DASHBOARD_SRC}
      alt={t("download.dashboardAltHero")}
      className={cn("hero-device-screen-img h-full w-full object-cover object-top", className)}
      width={390}
      height={844}
      fetchPriority="high"
    />
  );
}

export function HeroAnimatedDeviceShowcase({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn("hero-device-stage relative mx-auto w-full max-w-[420px]", className)}>
      <div className="hero-device-orbit pointer-events-none" aria-hidden />
      <div className="hero-device-orbit hero-device-orbit--delayed pointer-events-none" aria-hidden />
      <div className="hero-device-ring pointer-events-none" aria-hidden />

      <div className="relative flex items-end justify-center gap-2 sm:gap-4">
        <div className="hero-device-android relative w-[38%] max-w-[168px] pb-6 sm:pb-8">
          <div className="hero-device-frame hero-device-frame--android overflow-hidden rounded-[1.65rem] border-2 border-[#2b2b2b] bg-[#2b2b2b] p-[5px] shadow-xl">
            <div className="relative aspect-[390/844] overflow-hidden rounded-[1.35rem] bg-white">
              <div
                className="absolute left-1/2 top-2 z-10 size-2 -translate-x-1/2 rounded-full bg-[#111]"
                aria-hidden
              />
              <DashboardScreen />
            </div>
          </div>
        </div>

        <div className="hero-device-iphone relative z-10 w-[44%] max-w-[200px] sm:max-w-[220px]">
          <div className="hero-device-frame hero-device-frame--ios overflow-hidden rounded-[2rem] border-[3px] border-[#141414] bg-[#141414] p-[6px] shadow-2xl">
            <div className="relative aspect-[390/844] overflow-hidden rounded-[1.65rem] bg-white">
              <div
                className="absolute left-1/2 top-1.5 z-10 h-[18px] w-[32%] -translate-x-1/2 rounded-full bg-black sm:h-[20px]"
                aria-hidden
              />
              <div className="hero-device-screen-shine pointer-events-none" aria-hidden />
              <DashboardScreen />
            </div>
          </div>
          <div className="hero-device-chip pointer-events-none" aria-hidden>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-primary">
              {t("download.livePreview")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
