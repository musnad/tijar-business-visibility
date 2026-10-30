import { createFileRoute } from "@tanstack/react-router";

import { ShopHelpScreen } from "@/features/marketplace/shop-help-screen";

export const Route = createFileRoute("/shop/help")({
  component: ShopHelpScreen,
});
