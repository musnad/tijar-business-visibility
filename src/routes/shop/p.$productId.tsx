import { createFileRoute } from "@tanstack/react-router";

import { ProductDetailScreen } from "@/features/marketplace/product-detail-screen";

export const Route = createFileRoute("/shop/p/$productId")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  return <ProductDetailScreen productId={productId} />;
}
