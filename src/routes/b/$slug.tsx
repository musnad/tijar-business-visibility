import { createFileRoute } from "@tanstack/react-router";

import { StorefrontScreen } from "@/features/discover/storefront-screen";

export const Route = createFileRoute("/b/$slug")({
  head: () => ({
    meta: [
      { title: "Shop on TIJAR" },
      { name: "description", content: "View this local business on TIJAR: products, services, opening hours and contact options." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  return <StorefrontScreen slug={slug} />;
}
