import { createFileRoute } from "@tanstack/react-router";

import { ShopDiscoverScreen } from "@/features/marketplace/shop-discover-screen";

export const Route = createFileRoute("/shop/discover")({
  component: ShopDiscoverScreen,
});
