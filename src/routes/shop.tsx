import { Outlet, createFileRoute, useChildMatches } from "@tanstack/react-router";

import { ShopHomeScreen } from "@/features/marketplace/shop-home-screen";

export const Route = createFileRoute("/shop")({
  component: ShopLayout,
});

function ShopLayout() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }
  return <ShopHomeScreen />;
}
