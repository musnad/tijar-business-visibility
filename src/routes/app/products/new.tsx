import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { NewProductForm } from "@/features/products/new-product-form";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  return (
    <RequireAuth>
      <NewProductPageContent />
    </RequireAuth>
  );
}

function NewProductPageContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.products.addTitle")}
        subtitle={t("app.products.addSubtitle")}
        action={<BackLinkButton to="/app/products" label={t("app.common.back")} />}
      />
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
      {business && profile?.id && (
        <NewProductForm businessId={business.id} profileId={profile.id} />
      )}
    </AppShell>
  );
}
