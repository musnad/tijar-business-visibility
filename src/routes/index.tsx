import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { HeroAnimatedDeviceShowcase } from "@/components/hero-device-showcase";
import { LandingDownloadCta } from "@/components/landing-gamification";
import { Button } from "@/components/ui/button";
import { BusinessProfileCard, SectionIntro } from "@/components/tijar-ui";
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

const audienceForKeys = [
  "home.audience.for.traders",
  "home.audience.for.food",
  "home.audience.for.tailors",
  "home.audience.for.beauty",
  "home.audience.for.mechanics",
  "home.audience.for.shops",
] as const;

const audienceNotKeys = [
  "home.audience.not.offices",
  "home.audience.not.banks",
  "home.audience.not.accountants",
  "home.audience.not.software",
] as const;

const problemKeys = ["noRecords", "noDigitalPresence", "limitedOpportunities"] as const;
const howItWorksLevelKeys = ["level1", "level2", "level3"] as const;
const businessTypeKeys = [
  "generalRetail",
  "restaurants",
  "fashionTailoring",
  "beauty",
  "autoMechanics",
  "electronics",
  "foodProvisions",
  "artisans",
  "buildingMaterials",
  "other",
] as const;
const sceneKeys = [
  { src: "/tijar-market-stall.jpg", label: "home.scenes.market", alt: "home.scenes.marketAlt" },
  { src: "/tijar-tailor-shop.jpg", label: "home.scenes.tailor", alt: "home.scenes.tailorAlt" },
  { src: "/tijar-food-stall.jpg", label: "home.scenes.food", alt: "home.scenes.foodAlt" },
] as const;

const languageKeys = [
  "home.languages.english",
  "home.languages.hausa",
  "home.languages.arabic",
  "home.languages.yoruba",
  "home.languages.igbo",
  "home.languages.swahili",
] as const;

function Home() {
  const { t } = useTranslation();

  return (
    <>
      <section className="brand-hero-surface overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.85fr)] lg:gap-8 lg:px-6 lg:py-20">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {t("home.audience.eyebrow")}
            </p>
            <h1 className="mt-4 max-w-xl text-[2.35rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.35rem]">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {t("home.heroDesc")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/login">
                  {t("nav.signIn")} <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <Link to="/app/register">{t("common.getStarted")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <a href="#download-app">{t("home.getTheApp")}</a>
              </Button>
            </div>
          </div>
          <HeroAnimatedDeviceShowcase className="mx-auto w-full max-w-[280px] sm:max-w-[420px] lg:max-w-none lg:justify-self-end" />
        </div>
      </section>

      <section aria-label={t("home.scenes.label")} className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-6">
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-4 md:overflow-visible [&::-webkit-scrollbar]:hidden">
            {sceneKeys.map((scene) => (
              <li key={scene.src} className="w-[84%] shrink-0 snap-start md:w-auto">
                <figure>
                  <img
                    src={scene.src}
                    alt={t(scene.alt)}
                    width={1200}
                    height={900}
                    className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg"
                  />
                  <figcaption className="mt-3 text-sm font-semibold">{t(scene.label)}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-6">
          <p className="text-sm font-bold text-foreground">{t("home.audience.title")}</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
            {audienceForKeys.map((key) => (
              <span
                key={key}
                className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground"
              >
                {t(key)}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{t("home.audience.notLabel")}. </span>
            {audienceNotKeys.map((key) => t(key)).join(" · ")}
          </p>
        </div>
      </section>

      <section id="the-need">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 lg:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {t("home.problem.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">
              {t("home.problem.title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {t("home.problem.copy")}
            </p>
          </div>
          <ol className="mt-10 border-t border-border">
            {problemKeys.map((key, index) => (
              <li
                key={key}
                className="grid gap-2 border-b border-border py-6 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-start sm:gap-6"
              >
                <span className="text-sm font-extrabold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl font-bold">{t(`home.problemCards.${key}.title`)}</h3>
                  <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
                    {t(`home.problemCards.${key}.copy`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-card/50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24 lg:px-6">
          <SectionIntro eyebrow={t("home.howItWorks.eyebrow")} title={t("home.howItWorks.title")} />
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {howItWorksLevelKeys.map((levelKey, index) => (
              <div key={levelKey}>
                <p className="text-5xl font-extrabold tracking-tight text-primary">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-2xl font-bold">{t(`home.howItWorks.${levelKey}.title`)}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">
                  {t(`home.howItWorks.${levelKey}.copy`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:py-24 lg:grid-cols-2 lg:px-6">
          <div>
            <SectionIntro
              eyebrow={t("home.visibility.eyebrow")}
              title={t("home.visibility.title")}
              copy={t("home.visibility.copy")}
            />
            <p className="mt-6 text-lg font-bold">{t("home.visibility.tagline")}</p>
            <Button asChild variant="outline" className="mt-8">
              <Link to="/business-visibility">
                {t("nav.businessVisibility")} <ArrowRight />
              </Link>
            </Button>
          </div>
          <BusinessProfileCard />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20 lg:px-6">
          <h2 className="max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
            {t("home.businesses.title")}
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {businessTypeKeys.map((key) => (
              <span
                key={key}
                className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold"
              >
                {t(`businessTypes.${key}`)}
              </span>
            ))}
          </div>
          <div className="mt-10 border-t border-border pt-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {t("home.languages.eyebrow")}
            </p>
            <p className="mt-3 max-w-xl text-lg font-bold">{t("home.languages.title")}</p>
            <p className="mt-2 max-w-xl leading-7 text-muted-foreground">{t("home.languages.copy")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {languageKeys.map((key) => (
                <span key={key} className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">
                  {t(key)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="account-access" className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-6 lg:py-16">
          <div className="mx-auto max-w-xl rounded-3xl border border-border bg-background p-8 text-center shadow-sm">
            <h2 className="text-2xl font-extrabold tracking-tight">{t("auth.accessTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("auth.accessDesc")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link to="/login">{t("nav.signIn")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/app/register">{t("common.getStarted")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <LandingDownloadCta />
    </>
  );
}
