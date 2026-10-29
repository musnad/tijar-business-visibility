import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";
import { SellerPage } from "@/features/videos/seller-page";
import { SellerTeamScreen } from "@/features/videos/seller-team-screen";

export const Route = createFileRoute("/app/team")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <SellerPage>{({ businessId }) => <SellerTeamScreen businessId={businessId} />}</SellerPage>
    </RequireAuth>
  );
}
