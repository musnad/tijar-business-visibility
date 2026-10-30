import { createFileRoute } from "@tanstack/react-router";

import { VideoCreateScreen } from "@/features/marketplace/video-create-screen";

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
  return <VideoCreateScreen openCamera={camera} productId={productId} />;
}
