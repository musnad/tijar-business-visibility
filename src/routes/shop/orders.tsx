import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/shop/orders")({
  component: ShopOrdersLayout,
});

function ShopOrdersLayout() {
  return <Outlet />;
}
