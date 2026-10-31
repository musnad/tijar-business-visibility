import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { RouteFallback } from "@/components/route-fallback";

const VideoCreateScreen = lazy(() =>
  import("@/features/marketplace/video-create-screen").then((m) => ({ default: m.VideoCreateScreen })),
);

export const Route = createFileRoute("/shop/create")({
  validateSearch: (s: Record<string, unknown>) => {
    const camera = s.camera === true || s.camera === "1" || s.camera === "true";
    const productId = typeof s.productId === "string" ? s.productId : undefined;
    return {
      ...(camera ? { camera: true as const } : {}),
      ...(productId ? { productId } : {}),
    };
  },
  component: CreatePage,
});

function CreatePage() {
  const { camera, productId } = Route.useSearch();
  return (
    <Suspense fallback={<RouteFallback />}>
      <VideoCreateScreen openCamera={camera} productId={productId} />
    </Suspense>
  );
}
