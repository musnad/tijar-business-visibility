"use client";

import { Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { TijarLogo } from "@/components/brand-logo";
import { useTranslation } from "@/lib/i18n/context";

export function WebAuthLayout({
  mode,
  title,
  subtitle,
  children,
  footer,
}: {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="web-auth-root min-h-[100dvh] bg-[#f0f4f8] text-[#001B3A]">
      <div className="mx-auto grid min-h-[100dvh] max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <aside className="web-auth-brand relative flex flex-col justify-between overflow-hidden px-6 py-8 sm:px-10 lg:min-h-[100dvh] lg:py-12">
          <div className="pointer-events-none absolute inset-0 web-auth-brand-gradient" aria-hidden />
          <div className="relative z-10">
            <Link to="/" className="inline-block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <TijarLogo className="max-h-12 w-auto brightness-0 invert sm:max-h-14" />
            </Link>
            <p className="mt-8 max-w-sm text-sm font-semibold uppercase tracking-[0.14em] text-white/80">
              {t("auth.webBrandEyebrow")}
            </p>
            <h1 className="mt-3 max-w-md text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              {mode === "login" ? t("auth.webLoginHero") : t("auth.webRegisterHero")}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">{t("auth.webBrandBody")}</p>
            <ul className="mt-8 space-y-3 text-sm text-white/90">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[#1B8A52]" aria-hidden />
                {t("auth.webBullet1")}
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[#1B8A52]" aria-hidden />
                {t("auth.webBullet2")}
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[#1B8A52]" aria-hidden />
                {t("auth.webBullet3")}
              </li>
            </ul>
          </div>
          <div className="relative z-10 mt-10 hidden rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm lg:block">
            <img
              src="/tijar-app-dashboard.png"
              alt=""
              className="rounded-xl shadow-2xl ring-1 ring-white/20"
              width={480}
              height={320}
            />
          </div>
          <p className="relative z-10 mt-8 flex items-center gap-2 text-xs text-white/70">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {t("auth.securityFooter")}
          </p>
        </aside>

        <main className="flex flex-col justify-center px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12 lg:py-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:mb-10">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2AA86A]">{t("auth.webFormLabel")}</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6578]">{subtitle}</p>
            </div>
            <div className="web-auth-panel rounded-2xl border border-[#dce3ea] bg-white p-6 shadow-[0_12px_40px_rgba(0,27,58,0.08)] sm:p-8">
              {children}
            </div>
            {footer}
          </div>
        </main>
      </div>
    </div>
  );
}
