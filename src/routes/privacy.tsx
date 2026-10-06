import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n/context";
import { enMessages } from "@/lib/i18n/messages/en";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: enMessages.meta.privacy.title },
      { name: "description", content: enMessages.meta.privacy.description },
      { property: "og:title", content: enMessages.meta.privacy.ogTitle },
      { property: "og:description", content: enMessages.meta.privacy.ogDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const sectionKeys = [
  "approach",
  "information",
  "usage",
  "publicProfiles",
  "choices",
  "preview",
] as const;

function Page() {
  const { t } = useTranslation();

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
        {t("pages.privacy.eyebrow")}
      </p>
      <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{t("pages.privacy.title")}</h1>
      <p className="mt-5 text-muted-foreground">{t("pages.privacy.lastUpdated")}</p>
      <div className="mt-12 space-y-10 leading-8 text-muted-foreground">
        {sectionKeys.map((key) => (
          <PolicySection
            key={key}
            title={t(`pages.privacy.sections.${key}.title`)}
            body={t(`pages.privacy.sections.${key}.body`)}
          />
        ))}
      </div>
    </article>
  );
}

function PolicySection({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-2xl font-extrabold text-foreground">{title}</h2>
      <p className="mt-3">{body}</p>
    </section>
  );
}
