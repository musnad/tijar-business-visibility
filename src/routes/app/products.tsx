import { Outlet, createFileRoute, useChildMatches } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { RequireAuth } from "@/features/app/require-auth";
import { ProductsScreen } from "@/features/products/products-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/products")({
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <RequireAuth>
      <ProductsPageContent />
    </RequireAuth>
  );
}

function ProductsPageContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;
  // /app/products/new | scan-shop | adjust are child routes — render them via Outlet.
  const childMatches = useChildMatches();

  if (childMatches.length > 0) {
    return <Outlet />;
  }

  return (
    <AppShell fab="product">
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
      {business && <ProductsScreen businessId={business.id} />}
    </AppShell>
  );
}
