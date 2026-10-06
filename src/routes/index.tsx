import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calculator,
  Eye,
  Scissors,
  ShoppingBasket,
  Store,
  Utensils,
  Wrench,
  Lightbulb,
  MapPinOff,
  NotebookPen,
} from "lucide-react";
import { HeroAnimatedDeviceShowcase } from "@/components/hero-device-showcase";
import { HeroLogoShowcase } from "@/components/hero-logo-showcase";
import {
  AchievementStrip,
  BusinessQuestBoard,
  HeroGameStats,
  InteractiveLandingQuiz,
  LandingDownloadCta,
} from "@/components/landing-gamification";
import { Button } from "@/components/ui/button";
import {
  BusinessProfileCard,
  FeatureCard,
  SectionIntro,
} from "@/components/tijar-ui";
import { useTranslation } from "@/lib/i18n/context";
import { enMessages } from "@/lib/i18n/messages/en";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: enMessages.meta.home.title },
      { name: "description", content: enMessages.meta.home.description },
      { property: "og:title", content: enMessages.meta.home.ogTitle },
      { property: "og:description", content: enMessages.meta.home.ogDescription },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/tijar-logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/tijar-logo.png" },
    ],
  }),
  component: Home,
});

const businessTypeKeys = [
  ["foodProvisions", ShoppingBasket],
  ["fashionTailoring", Scissors],
  ["restaurants", Utensils],
  ["beauty", Eye],
  ["electronics", Store],
  ["autoMechanics", Wrench],
  ["buildingMaterials", Calculator],
  ["generalRetail", Store],
  ["artisans", Lightbulb],
  ["other", Store],
] as const;

const languageKeys = [
  "home.languages.english",
  "home.languages.hausa",
  "home.languages.arabic",
  "home.languages.yoruba",
  "home.languages.igbo",
  "home.languages.swahili",
] as const;

const howItWorksLevelKeys = ["level1", "level2", "level3"] as const;

function Home() {
  const { t } = useTranslation();

  return (
    <>
      <section className="brand-hero-surface overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:gap-14 sm:py-24 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-center lg:gap-10 lg:px-6 lg:py-28">
          <div className="min-w-0">
            <HeroLogoShowcase />
            <h1 className="hero-reveal hero-reveal-delay-1 mt-8 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t("home.heroTitle")}
            </h1>
            <p className="hero-reveal hero-reveal-delay-2 mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              {t("home.heroDesc")}
            </p>
            <div className="hero-reveal hero-reveal-delay-3 mt-6">
              <HeroGameStats />
            </div>
            <div className="hero-reveal hero-reveal-delay-4 mt-8 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="lg">
                <Link to="/how-it-works">{t("home.seeHowItWorks")}</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <a href="#download-app">
                  {t("home.appFeatures")} <ArrowRight />
                </a>
              </Button>
            </div>
            <div className="hero-reveal hero-reveal-delay-4 mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-6 text-sm font-extrabold uppercase tracking-[0.12em]">
              <span className="text-primary">{t("common.learn")}.</span>
              <span className="text-foreground">{t("common.run")}.</span>
              <span className="text-secondary-foreground">{t("common.grow")}.</span>
            </div>
          </div>

          <div className="relative lg:justify-self-end">
            <HeroAnimatedDeviceShowcase className="lg:max-w-none" />
          </div>
        </div>
      </section>

      <BusinessQuestBoard />

      <section>
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32 lg:px-6">
          <SectionIntro
            eyebrow={t("home.problem.eyebrow")}
            title={t("home.problem.title")}
            copy={t("home.problem.copy")}
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={NotebookPen}
              title={t("home.problemCards.noRecords.title")}
              copy={t("home.problemCards.noRecords.copy")}
            />
            <FeatureCard
              icon={MapPinOff}
              title={t("home.problemCards.noDigitalPresence.title")}
              copy={t("home.problemCards.noDigitalPresence.copy")}
            />
            <FeatureCard
              icon={Lightbulb}
              title={t("home.problemCards.limitedOpportunities.title")}
              copy={t("home.problemCards.limitedOpportunities.copy")}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32 lg:px-6">
          <SectionIntro
            eyebrow={t("home.features.eyebrow")}
            title={t("home.features.title")}
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              number={t("home.features.record.number")}
              title={t("home.features.record.title")}
              copy={t("home.features.record.copy")}
            />
            <FeatureCard
              number={t("home.features.understand.number")}
              title={t("home.features.understand.title")}
              copy={t("home.features.understand.copy")}
            />
            <FeatureCard
              number={t("home.features.learn.number")}
              title={t("home.features.learn.title")}
              copy={t("home.features.learn.copy")}
            />
            <FeatureCard
              number={t("home.features.verified.number")}
              title={t("home.features.verified.title")}
              copy={t("home.features.verified.copy")}
            />
          </div>
          <AchievementStrip />
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:py-32 lg:grid-cols-2 lg:items-start lg:px-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {t("home.learnSection.eyebrow")}
            </p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              {t("home.learnSection.title")}
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {t("home.learnSection.copy")}
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/learn">
                {t("home.learnSection.cta")} <ArrowRight />
              </Link>
            </Button>
          </div>
          <InteractiveLandingQuiz />
        </div>
      </section>

      <section className="border-y border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:py-32 lg:grid-cols-2 lg:items-center lg:px-6">
          <div>
            <SectionIntro
              eyebrow={t("home.visibility.eyebrow")}
              title={t("home.visibility.title")}
              copy={t("home.visibility.copy")}
            />
            <p className="mt-6 text-xl font-bold">{t("home.visibility.tagline")}</p>
          </div>
          <BusinessProfileCard />
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32 lg:px-6">
          <SectionIntro
            eyebrow={t("home.howItWorks.eyebrow")}
            align="center"
            title={t("home.howItWorks.title")}
          />
          <div className="relative mt-12 grid gap-5 md:grid-cols-3">
            {howItWorksLevelKeys.map((levelKey) => (
              <div
                key={levelKey}
                className="relative rounded-[1.25rem] border border-border bg-card p-6"
              >
                <span className="text-sm font-extrabold text-primary">
                  {t(`home.howItWorks.${levelKey}.label`)}
                </span>
                <h3 className="mt-7 text-xl font-bold">
                  {t(`home.howItWorks.${levelKey}.title`)}
                </h3>
                <p className="mt-3 leading-7 text-muted-foreground">
                  {t(`home.howItWorks.${levelKey}.copy`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32 lg:px-6">
          <SectionIntro
            eyebrow={t("home.businesses.eyebrow")}
            align="center"
            title={t("home.businesses.title")}
          />
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {businessTypeKeys.map(([key, Icon]) => (
              <div
                key={key}
                className="flex min-h-28 flex-col items-center justify-center rounded-[1.25rem] border border-border bg-card p-4 text-center"
              >
                <Icon className="size-6 text-primary" />
                <span className="mt-3 text-sm font-bold">{t(`businessTypes.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/35">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:px-6">
          <SectionIntro
            eyebrow={t("home.languages.eyebrow")}
            title={t("home.languages.title")}
            copy={t("home.languages.copy")}
          />
          <div className="flex max-w-lg flex-wrap gap-3">
            {languageKeys.map((key) => (
              <span
                key={key}
                className="rounded-full border border-border bg-card px-5 py-3 font-bold"
              >
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <LandingDownloadCta />
    </>
  );
}
