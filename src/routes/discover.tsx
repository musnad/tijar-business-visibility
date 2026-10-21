import { createFileRoute } from "@tanstack/react-router";

import { DiscoverScreen } from "@/features/discover/discover-screen";
import { enMessages } from "@/lib/i18n/messages/en";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover local businesses — TIJAR" },
      {
        name: "description",
        content:
          "Find real local shops, food sellers, tailors, mechanics and services near you on TIJAR. Call, message or get directions.",
      },
      { property: "og:title", content: "Discover local businesses — TIJAR" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DiscoverScreen,
});

void enMessages;
