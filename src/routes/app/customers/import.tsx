import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { ImportContactsScreen } from "@/features/customers/import-contacts-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";

export const Route = createFileRoute("/app/customers/import")({
  component: ImportCustomersPage,
});

function ImportCustomersPage() {
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  return (
    <AppShell>
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">No business found for this account.</p>
      )}
      {business && <ImportContactsScreen businessId={business.id} />}
    </AppShell>
  );
}
