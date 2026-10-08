import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { RequireAuth } from "@/features/app/require-auth";
import { SupplierListPage } from "@/features/suppliers/supplier-list-page";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  return (
    <RequireAuth>
      <SuppliersPageContent />
    </RequireAuth>
  );
}

function SuppliersPageContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.suppliers.title")}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/business">{t("app.common.back")}</Link>
          </Button>
        }
      />
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
      {business && <div className="mt-8"><SupplierListPage businessId={business.id} /></div>}
    </AppShell>
  );
}
