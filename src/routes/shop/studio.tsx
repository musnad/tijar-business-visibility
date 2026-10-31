import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { RouteFallback } from "@/components/route-fallback";

const ShopStudioScreen = lazy(() =>
  import("@/features/marketplace/shop-studio-screen").then((m) => ({ default: m.ShopStudioScreen })),
);

export const Route = createFileRoute("/shop/studio")({
  component: ShopStudioPage,
});

function ShopStudioPage() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <ShopStudioScreen />
    </Suspense>
  );
}
