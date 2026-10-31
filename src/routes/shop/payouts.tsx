import { createFileRoute, Link } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/auth-context";
import { PayoutWalletScreen } from "@/features/business/payout-wallet-screen";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";

export const Route = createFileRoute("/shop/payouts")({
  component: Page,
});

function Page() {
  const { profile, session, loading } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business ?? null;

  return (
    <MarketplaceShell>
      {loading || isLoading ? <p className="px-4 pt-8 text-sm text-muted-foreground">…</p> : null}
      {!loading && !session ? (
        <p className="px-4 pt-8 text-sm text-muted-foreground">
          <Link to="/login" className="font-bold text-primary">
            Sign in
          </Link>{" "}
          to add the account buyers transfer to.
        </p>
      ) : null}
      {!loading && session && !isLoading && !business ? (
        <p className="px-4 pt-8 text-sm text-muted-foreground">Create a shop first, then add a bank account.</p>
      ) : null}
      {business ? <PayoutWalletScreen business={business} profileId={profile?.id} /> : null}
    </MarketplaceShell>
  );
}
