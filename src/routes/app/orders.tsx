import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";
import { SellerPage } from "@/features/videos/seller-page";
import { SellerOrdersInboxScreen } from "@/features/videos/seller-orders-inbox-screen";

export const Route = createFileRoute("/app/orders")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <SellerPage>{({ businessId }) => <SellerOrdersInboxScreen businessId={businessId} />}</SellerPage>
    </RequireAuth>
  );
}
