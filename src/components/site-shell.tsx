"use client";

import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TijarLogo } from "@/components/brand-logo";
import { SitePreferencesControls } from "@/components/site-preferences-controls";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();

  return (
    <Link
      to="/"
      aria-label={t("nav.tijarHome")}
      className="inline-flex max-w-[11rem] shrink-0 sm:max-w-[12.5rem]"
    >
      <TijarLogo className={compact ? "max-h-9 sm:max-h-10" : "max-h-11 sm:max-h-12"} />
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const links = useMemo(
    () =>
      [
        { labelKey: "nav.shop", to: "/shop" as const },
        { labelKey: "nav.discover", to: "/discover" as const },
        { labelKey: "nav.translator", to: "/translate" as const },
        { labelKey: "nav.howItWorks", to: "/how-it-works" as const },
        { labelKey: "nav.learn", to: "/learn" as const },
        { labelKey: "nav.about", to: "/about" as const },
      ] as const,
    [],
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:bg-background focus:p-3"
      >
        {t("nav.skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 lg:px-6">
        <BrandMark />
        <nav
          aria-label={t("nav.mainNavigation")}
          className="hidden items-center gap-4 lg:flex lg:gap-7"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {t(link.labelKey)}
            </Link>
          ))}
          <SitePreferencesControls compact />
          <Button variant="outline" asChild>
            <Link to="/login">{t("nav.signIn")}</Link>
          </Button>
          <Button asChild>
            <Link to="/" hash="download-app">
              {t("nav.downloadApp")}
            </Link>
          </Button>
        </nav>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 lg:hidden"
          aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav
          aria-label={t("nav.mobileNavigation")}
          className="border-t border-border bg-background px-5 py-5 lg:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base font-semibold hover:bg-accent"
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base font-semibold hover:bg-accent"
            >
              {t("nav.contact")}
            </Link>
            <div className="mt-4">
              <SitePreferencesControls stacked />
            </div>
            <Button variant="outline" asChild size="lg" className="mt-4">
              <Link to="/login" onClick={() => setOpen(false)}>
                {t("nav.signIn")}
              </Link>
            </Button>
            <Button asChild size="lg" className="mt-2">
              <Link to="/" hash="download-app" onClick={() => setOpen(false)}>
                {t("nav.downloadApp")}
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();

  const productLinks = [
    { labelKey: "nav.howItWorks", to: "/how-it-works" as const },
    { labelKey: "nav.learn", to: "/learn" as const },
    { labelKey: "nav.businessVisibility", to: "/business-visibility" as const },
    { labelKey: "nav.about", to: "/about" as const },
    { labelKey: "nav.contact", to: "/contact" as const },
  ] as const;

  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-6">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-xs text-sm leading-7 text-muted-foreground">
              {t("footer.tagline")}
            </p>
            <p className="mt-2 text-sm font-semibold text-primary">{t("footer.learnRunGrow")}</p>
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em]">{t("footer.product")}</h2>
            <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
              {productLinks.map((link) => (
                <Link key={link.to} to={link.to}>
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em]">{t("footer.legal")}</h2>
            <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
              <Link to="/privacy">{t("footer.privacy")}</Link>
              <Link to="/terms">{t("footer.terms")}</Link>
            </div>
            <div className="mt-6 flex gap-2" aria-label={t("footer.socialChannels")}>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label={t("footer.instagramComingSoon")}
                title={t("footer.comingSoon")}
              >
                <Instagram />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label={t("footer.linkedinComingSoon")}
                title={t("footer.comingSoon")}
              >
                <Linkedin />
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}
