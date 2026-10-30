import { createFileRoute } from "@tanstack/react-router";

import { ShopStudioScreen } from "@/features/marketplace/shop-studio-screen";

export const Route = createFileRoute("/shop/studio")({
  component: ShopStudioScreen,
});
