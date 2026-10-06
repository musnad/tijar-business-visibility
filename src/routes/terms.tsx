import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n/context";
import { enMessages } from "@/lib/i18n/messages/en";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: enMessages.meta.terms.title },
      { name: "description", content: enMessages.meta.terms.description },
      { property: "og:title", content: enMessages.meta.terms.ogTitle },
      { property: "og:description", content: enMessages.meta.terms.ogDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const sectionKeys = [
  "preview",
  "noFinancialPromise",
  "acceptableUse",
  "information",
  "changes",
] as const;

function Page() {
  const { t } = useTranslation();

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
        {t("pages.terms.eyebrow")}
      </p>
      <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{t("pages.terms.title")}</h1>
      <p className="mt-5 text-muted-foreground">{t("pages.terms.lastUpdated")}</p>
      <div className="mt-12 space-y-10 leading-8 text-muted-foreground">
        {sectionKeys.map((key) => (
          <TermSection
            key={key}
            title={t(`pages.terms.sections.${key}.title`)}
            body={t(`pages.terms.sections.${key}.body`)}
          />
        ))}
      </div>
    </article>
  );
}

function TermSection({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-2xl font-extrabold text-foreground">{title}</h2>
      <p className="mt-3">{body}</p>
    </section>
  );
}
