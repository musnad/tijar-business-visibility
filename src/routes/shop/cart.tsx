import { createFileRoute } from "@tanstack/react-router";

import { CartScreen } from "@/features/marketplace/cart-screen";

export const Route = createFileRoute("/shop/cart")({
  component: CartScreen,
});
