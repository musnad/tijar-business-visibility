import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";
import { SellerPage } from "@/features/videos/seller-page";
import { SellerVideoStudioScreen } from "@/features/videos/seller-video-studio-screen";

export const Route = createFileRoute("/app/videos/new")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <SellerPage>
        {({ businessId, profileId }) => (
          <SellerVideoStudioScreen businessId={businessId} profileId={profileId} />
        )}
      </SellerPage>
    </RequireAuth>
  );
}
