import { createFileRoute } from "@tanstack/react-router";
import { ContactForm } from "@/components/forms";
import { PageHero } from "@/components/tijar-ui";
import { useTranslation } from "@/lib/i18n/context";
import { enMessages } from "@/lib/i18n/messages/en";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: enMessages.meta.contact.title },
      { name: "description", content: enMessages.meta.contact.description },
      { property: "og:title", content: enMessages.meta.contact.ogTitle },
      { property: "og:description", content: enMessages.meta.contact.ogDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useTranslation();

  return (
    <>
      <PageHero
        eyebrow={t("pages.contact.heroEyebrow")}
        title={t("pages.contact.heroTitle")}
        copy={t("pages.contact.heroCopy")}
      />
      <section>
        <div className="mx-auto max-w-2xl px-5 py-24 sm:py-32">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
