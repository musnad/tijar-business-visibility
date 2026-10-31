import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { RequireAuth } from "@/features/app/require-auth";
import { BusinessScreen } from "@/features/business/business-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";

export const Route = createFileRoute("/app/business")({
  component: BusinessPage,
});

function BusinessPage() {
  return (
    <RequireAuth requireOnboardingComplete={false}>
      <BusinessPageContent />
    </RequireAuth>
  );
}

function BusinessPageContent() {
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);

  return (
    <AppShell>
      <BusinessScreen
        business={data?.business ?? null}
        dna={data?.dna ?? null}
        isLoading={isLoading}
      />
    </AppShell>
  );
}
