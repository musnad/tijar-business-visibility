import { createFileRoute } from "@tanstack/react-router";

import { BuyScreen } from "@/features/marketplace/buy-screen";

export const Route = createFileRoute("/shop/buy")({
  validateSearch: (s: Record<string, unknown>) => ({
    productId: typeof s.productId === "string" ? s.productId : undefined,
  }),
  component: Page,
});

function Page() {
  const { productId } = Route.useSearch();
  return <BuyScreen productId={productId} />;
}
