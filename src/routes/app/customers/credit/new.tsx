import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { NewCreditForm } from "@/features/customers/new-credit-form";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/customers/credit/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    customerId:
      typeof search.customerId === "string" && search.customerId.length > 0
        ? search.customerId
        : undefined,
  }),
  component: NewCreditPage,
});

function NewCreditPage() {
  const { t } = useTranslation();
  const { customerId } = Route.useSearch();
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.customers.creditTitle")}
        subtitle={t("app.customers.creditSubtitle")}
        action={<BackLinkButton to="/app/customers" label={t("app.common.back")} />}
      />
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
      {business && profile?.id && (
        <NewCreditForm
          businessId={business.id}
          profileId={profile.id}
          initialCustomerId={customerId}
        />
      )}
    </AppShell>
  );
}
