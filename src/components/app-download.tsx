"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

export const APP_DASHBOARD_SRC = "/tijar-app-dashboard.png";

type AppDownloadButtonsProps = {
  className?: string;
  layout?: "row" | "stack";
  size?: "default" | "lg";
  id?: string;
  theme?: "dark" | "light";
};

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.788.96-2.042 1.72-3.2 1.62-.15-1.09.476-2.26 1.13-3.01.83-.96 2.276-1.67 3.247-1.69zm1.12 3.44c-1.874-.112-3.472 1.066-4.365 1.066-.914 0-2.318-1.034-3.812-1.005-1.962.03-3.777 1.14-4.787 2.903-2.048 3.546-.524 8.797 1.453 11.677 1.005 1.434 2.193 3.045 3.762 2.988 1.515-.06 2.085-.978 3.915-.978 1.811 0 2.314.978 3.896.948 1.608-.026 2.624-1.464 3.61-2.905 1.138-1.653 1.606-3.26 1.631-3.341-.035-.016-3.134-1.203-3.17-4.777-.028-2.985 2.447-4.413 2.558-4.484-1.395-2.042-3.57-2.275-4.332-2.31z" />
    </svg>
  );
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#00F076" d="M3.6 1.8v20.4l11.1-10.2z" />
      <path fill="#FF3A44" d="M3.6 1.8l11.1 10.2 4.5-2.6z" />
      <path fill="#FFB900" d="M3.6 22.2l11.1-10.2-4.5-2.6z" />
      <path fill="#00D7FF" d="M14.7 11.1l4.5-2.6c1-.6 1-2.1 0-2.7l-4.5-2.6z" />
    </svg>
  );
}

function StoreLink({
  platform,
  size,
  theme,
}: {
  platform: "ios" | "android";
  size: "default" | "lg";
  theme: "dark" | "light";
}) {
  const { t } = useTranslation();
  const isIos = platform === "ios";
  const label = isIos ? t("common.appStore") : t("common.googlePlay");
  const sub = isIos ? t("download.downloadOnAppStore") : t("download.getItOnGooglePlay");
  const height = size === "lg" ? "h-[54px] min-w-[168px] px-3.5" : "h-[48px] min-w-[152px] px-3";

  return (
    <a
      href="#"
      role="button"
      onClick={(event) => event.preventDefault()}
      aria-label={`${sub} ${label}`}
      title={t("download.storeComingSoon")}
      className={cn(
        "store-badge inline-flex items-center gap-2.5 rounded-[10px] border transition-transform hover:scale-[1.02] active:scale-[0.98]",
        height,
        theme === "dark"
          ? "border-white/20 bg-black text-white shadow-lg shadow-black/25"
          : "border-black/10 bg-black text-white shadow-md",
      )}
    >
      {isIos ? (
        <AppleIcon className={cn("shrink-0", size === "lg" ? "size-7" : "size-6")} />
      ) : (
        <GooglePlayIcon className={cn("shrink-0", size === "lg" ? "size-7" : "size-6")} />
      )}
      <span className="text-left leading-none">
        <span className="block text-[10px] font-medium tracking-wide opacity-90">{sub}</span>
        <span
          className={cn(
            "block font-semibold tracking-tight",
            size === "lg" ? "text-[17px]" : "text-[15px]",
          )}
        >
          {label}
        </span>
      </span>
    </a>
  );
}

export function AppDownloadButtons({
  className,
  layout = "row",
  size = "default",
  id,
  theme = "dark",
}: AppDownloadButtonsProps) {
  return (
    <div
      id={id}
      className={cn(
        "flex flex-wrap gap-3",
        layout === "stack" && "flex-col items-start",
        className,
      )}
    >
      <StoreLink platform="ios" size={size} theme={theme} />
      <StoreLink platform="android" size={size} theme={theme} />
    </div>
  );
}

function DeviceScreen({ alt }: { alt: string }) {
  return (
    <img
      src={APP_DASHBOARD_SRC}
      alt={alt}
      className="h-full w-full object-cover object-top"
      width={390}
      height={844}
      loading="lazy"
    />
  );
}

function IosDevice({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative mx-auto w-[min(100%,220px)] sm:w-[240px]", className)}>
      <div className="rounded-[2.35rem] border-[3px] border-[#1a1a1a] bg-[#1a1a1a] p-[7px] shadow-[0_28px_60px_-24px_rgba(0,0,0,0.55)]">
        <div className="relative aspect-[390/844] overflow-hidden rounded-[1.95rem] bg-white">
          <div
            className="pointer-events-none absolute left-1/2 top-2 z-10 h-[22px] w-[28%] -translate-x-1/2 rounded-full bg-black"
            aria-hidden
          />
          <DeviceScreen alt={t("download.dashboardAltIos")} />
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {t("download.ios")}
      </p>
    </div>
  );
}

function AndroidDevice({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative mx-auto w-[min(100%,210px)] sm:w-[228px]", className)}>
      <div className="rounded-[2rem] border-[2px] border-[#2b2b2b] bg-[#2b2b2b] p-[6px] shadow-[0_24px_50px_-22px_rgba(0,0,0,0.5)]">
        <div className="relative aspect-[390/844] overflow-hidden rounded-[1.55rem] bg-white">
          <div
            className="pointer-events-none absolute left-1/2 top-2.5 z-10 size-2.5 -translate-x-1/2 rounded-full bg-[#111]"
            aria-hidden
          />
          <DeviceScreen alt={t("download.dashboardAltAndroid")} />
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {t("download.android")}
      </p>
    </div>
  );
}

export function AppDeviceShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("relative px-2 py-4 sm:px-4", className)}>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-end justify-center gap-3 sm:gap-6">
        <AndroidDevice className="mb-2 scale-[0.92] opacity-95 sm:mb-4" />
        <IosDevice className="z-10 sm:-translate-y-2" />
      </div>
    </div>
  );
}

export function AppDownloadShowcase({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
      <div className="text-center lg:text-start">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">
          {t("download.mobileApp")}
        </p>
        <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          {t("download.heroTitle")}
        </h2>
        <p className="mt-4 text-base leading-8 text-background/80 sm:text-lg">
          {t("download.heroCopy")} {t("download.signupInApp")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
          <AppDownloadButtons size="lg" theme={theme} />
        </div>
        <p className="mt-4 text-xs text-background/60">{t("download.storeLinksNote")}</p>
      </div>
      <AppDeviceShowcase />
    </div>
  );
}
