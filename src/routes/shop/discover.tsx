import { createFileRoute } from "@tanstack/react-router";

import { ShopHomeScreen } from "@/features/marketplace/shop-home-screen";

export const Route = createFileRoute("/shop/discover")({
  component: ShopHomeScreen,
});
