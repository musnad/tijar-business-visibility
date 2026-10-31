import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { SellerPage } from "@/features/videos/seller-page";
import { RouteFallback } from "@/components/route-fallback";

const MarketingStudioScreen = lazy(() =>
  import("@/features/videos/marketing-studio-screen").then((m) => ({ default: m.MarketingStudioScreen })),
);

export const Route = createFileRoute("/app/studio")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <StudioInner />
    </RequireAuth>
  );
}

function StudioInner() {
  const { profile } = useAuth();
  const biz = usePrimaryBusiness(profile?.id);
  return (
    <SellerPage>
      {({ businessId }) => (
        <Suspense fallback={<RouteFallback />}>
          <MarketingStudioScreen
            businessId={businessId}
            businessName={biz.data?.business?.business_name ?? "Your shop"}
            profileId={profile?.id ?? ""}
          />
        </Suspense>
      )}
    </SellerPage>
  );
}
