import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { RecordsDataScreen } from "@/features/records/records-data-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/records")({
  component: RecordsDataPage,
});

function RecordsDataPage() {
  return (
    <RequireAuth>
      <RecordsDataPageContent />
    </RequireAuth>
  );
}

function RecordsDataPageContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.records.title")}
        subtitle={t("app.records.subtitle")}
        action={<BackLinkButton to="/app/transactions" label={t("app.common.back")} />}
      />
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
      {business && profile && (
        <RecordsDataScreen
          businessId={business.id}
          profileId={profile.id}
          businessName={business.business_name}
        />
      )}
    </AppShell>
  );
}
