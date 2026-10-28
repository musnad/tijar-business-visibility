import { createFileRoute } from "@tanstack/react-router";

import { ShopProfileScreen } from "@/features/marketplace/shop-profile-screen";

export const Route = createFileRoute("/shop/profile")({
  component: ShopProfileScreen,
});
