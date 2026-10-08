import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { CustomersScreen } from "@/features/customers/customers-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/customers/")({
  component: CustomersIndexPage,
});

function CustomersIndexPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  if (!profile) return null;

  return (
    <AppShell fab="credit">
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
      {business && <CustomersScreen businessId={business.id} />}
    </AppShell>
  );
}
