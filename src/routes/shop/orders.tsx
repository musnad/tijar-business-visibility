import { createFileRoute } from "@tanstack/react-router";

import { OrdersScreen } from "@/features/marketplace/orders-screen";

export const Route = createFileRoute("/shop/orders")({
  component: OrdersScreen,
});
