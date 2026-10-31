import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";
import { SellerPage } from "@/features/videos/seller-page";
import { RouteFallback } from "@/components/route-fallback";

const SellerVideoStudioScreen = lazy(() =>
  import("@/features/videos/seller-video-studio-screen").then((m) => ({
    default: m.SellerVideoStudioScreen,
  })),
);

export const Route = createFileRoute("/app/videos/new")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <SellerPage>
        {({ businessId, profileId }) => (
          <Suspense fallback={<RouteFallback />}>
            <SellerVideoStudioScreen businessId={businessId} profileId={profileId} embedded />
          </Suspense>
        )}
      </SellerPage>
    </RequireAuth>
  );
}
