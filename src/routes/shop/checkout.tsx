import { createFileRoute } from "@tanstack/react-router";

import { CheckoutScreen } from "@/features/marketplace/checkout-screen";

export const Route = createFileRoute("/shop/checkout")({
  component: CheckoutScreen,
});
