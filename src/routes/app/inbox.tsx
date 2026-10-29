import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";
import { SellerPage } from "@/features/videos/seller-page";
import { SellerInboxScreen } from "@/features/videos/seller-inbox-screen";

export const Route = createFileRoute("/app/inbox")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <SellerPage>{({ businessId }) => <SellerInboxScreen businessId={businessId} />}</SellerPage>
    </RequireAuth>
  );
}
