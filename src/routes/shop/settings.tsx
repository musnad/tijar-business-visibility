import { createFileRoute } from "@tanstack/react-router";

import { ShopSettingsScreen } from "@/features/marketplace/shop-settings-screen";

export const Route = createFileRoute("/shop/settings")({
  component: ShopSettingsScreen,
});
