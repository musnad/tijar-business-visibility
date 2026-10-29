import { createFileRoute } from "@tanstack/react-router";

import { ShopBrowseScreen } from "@/features/marketplace/shop-browse-screen";

export const Route = createFileRoute("/shop/browse")({
  component: ShopBrowseScreen,
});
