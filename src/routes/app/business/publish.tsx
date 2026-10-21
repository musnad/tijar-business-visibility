import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { PublishBusinessForm } from "@/features/discover/publish-business-form";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";

export const Route = createFileRoute("/app/business/publish")({
  component: PublishPage,
});

function PublishPage() {
  return (
    <RequireAuth>
      <PublishPageContent />
    </RequireAuth>
  );
}

function PublishPageContent() {
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  return (
    <AppShell>
      <AppPageHeader title="Shop visibility" action={<BackLinkButton to="/app/business" label="Back" />} />
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && <p className="mt-8 text-sm text-destructive">No business found.</p>}
      {business && <PublishBusinessForm business={business} />}
    </AppShell>
  );
}
