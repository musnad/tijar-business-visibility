import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, BookOpen, Eye, NotebookPen } from "lucide-react";
import { FeatureCard, FinalCta, PageHero, PhoneMockup, SectionIntro } from "@/components/tijar-ui";
import { useTranslation } from "@/lib/i18n/context";
import { enMessages } from "@/lib/i18n/messages/en";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: enMessages.meta.howItWorks.title },
      { name: "description", content: enMessages.meta.howItWorks.description },
      { property: "og:title", content: enMessages.meta.howItWorks.ogTitle },
      { property: "og:description", content: enMessages.meta.howItWorks.ogDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const journeyKeys = [
  "activity",
  "record",
  "identity",
  "visibility",
  "intelligence",
  "growth",
] as const;

function Page() {
  const { t } = useTranslation();

  return (
    <>
      <PageHero
        eyebrow={t("pages.howItWorks.heroEyebrow")}
        title={t("pages.howItWorks.heroTitle")}
        copy={t("pages.howItWorks.heroCopy")}
      >
        <PhoneMockup screen="record" />
      </PageHero>
      <section>
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32 lg:px-6">
          <SectionIntro align="center" title={t("pages.howItWorks.stepsTitle")} />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <FeatureCard
              number={t("pages.howItWorks.steps.create.number")}
              icon={NotebookPen}
              title={t("pages.howItWorks.steps.create.title")}
              copy={t("pages.howItWorks.steps.create.copy")}
            />
            <FeatureCard
              number={t("pages.howItWorks.steps.recordLearn.number")}
              icon={BookOpen}
              title={t("pages.howItWorks.steps.recordLearn.title")}
              copy={t("pages.howItWorks.steps.recordLearn.copy")}
            />
            <FeatureCard
              number={t("pages.howItWorks.steps.verify.number")}
              icon={BadgeCheck}
              title={t("pages.howItWorks.steps.verify.title")}
              copy={t("pages.howItWorks.steps.verify.copy")}
            />
          </div>
        </div>
      </section>
      <section>
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32 lg:px-6">
          <SectionIntro
            eyebrow={t("pages.howItWorks.journeyEyebrow")}
            title={t("pages.howItWorks.journeyTitle")}
          />
          <div className="mt-12 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {journeyKeys.map((key, index) => (
              <div className="rounded-[1.25rem] border border-border bg-card p-5" key={key}>
                <span className="text-xs font-bold text-primary">0{index + 1}</span>
                <p className="mt-6 font-bold">{t(`pages.howItWorks.journeySteps.${key}`)}</p>
                {index < 5 && <Eye className="mt-5 size-4 text-secondary-foreground" />}
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
