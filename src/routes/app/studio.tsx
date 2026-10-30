import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/app/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { SellerPage } from "@/features/videos/seller-page";
import { MarketingStudioScreen } from "@/features/videos/marketing-studio-screen";

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
        <MarketingStudioScreen
          businessId={businessId}
          businessName={biz.data?.business?.business_name ?? "Your shop"}
          profileId={profile?.id ?? ""}
        />
      )}
    </SellerPage>
  );
}
