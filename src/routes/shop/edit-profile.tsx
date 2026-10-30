import { createFileRoute } from "@tanstack/react-router";

import { ShopEditProfileScreen } from "@/features/marketplace/shop-edit-profile-screen";

export const Route = createFileRoute("/shop/edit-profile")({
  component: ShopEditProfileScreen,
});
