import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { RequireAuth } from "@/features/app/require-auth";
import { RecordSalesScreen } from "@/features/sales/record-sales-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/sales")({
  component: SalesPage,
});

function SalesPage() {
  return (
    <RequireAuth>
      <SalesPageContent />
    </RequireAuth>
  );
}

function SalesPageContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  return (
    <AppShell fab="sale">
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
      {business && <RecordSalesScreen businessId={business.id} />}
    </AppShell>
  );
}
