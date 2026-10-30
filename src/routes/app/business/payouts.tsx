import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { RequireAuth } from "@/features/app/require-auth";
import { PayoutWalletScreen } from "@/features/business/payout-wallet-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";

export const Route = createFileRoute("/app/business/payouts")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <Content />
    </RequireAuth>
  );
}

function Content() {
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business ?? null;
  return (
    <AppShell>
      {isLoading ? <p className="mt-8 text-muted-foreground">…</p> : null}
      {!isLoading && !business ? (
        <p className="mt-8 text-sm text-muted-foreground">Create a shop first.</p>
      ) : null}
      {business ? <PayoutWalletScreen business={business} /> : null}
    </AppShell>
  );
}
