import { createFileRoute } from "@tanstack/react-router";

import { NearbyScreen } from "@/features/marketplace/nearby-screen";

export const Route = createFileRoute("/shop/nearby")({
  head: () => ({
    meta: [
      { title: "Nearby products — TIJAR Marketplace" },
      {
        name: "description",
        content: "Discover nearby informal shops on the map and buy products on TIJAR.",
      },
    ],
  }),
  component: NearbyScreen,
});
