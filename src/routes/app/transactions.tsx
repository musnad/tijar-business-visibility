import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { RequireAuth } from "@/features/app/require-auth";
import { DashboardRecentTransactions } from "@/features/dashboard/recent-transactions";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";
import { listRecentTransactions } from "@/services/transaction-service";

export const Route = createFileRoute("/app/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <RequireAuth>
      <TransactionsPageContent />
    </RequireAuth>
  );
}

function TransactionsPageContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: businessData, isLoading } = usePrimaryBusiness(profile?.id);
  const business = businessData?.business;

  const { data: rows = [] } = useQuery({
    queryKey: ["all-transactions", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const result = await listRecentTransactions(business!.id, 50);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.transactions.title")}
        subtitle={t("app.transactions.subtitle")}
        action={
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" className="rounded-full" asChild>
              <Link to="/app/records">{t("app.records.short")}</Link>
            </Button>
            <Button size="sm" className="rounded-full" asChild>
              <Link to="/app/sales">{t("app.transactions.new")}</Link>
            </Button>
          </div>
        }
      />

      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {business && (
        <div className="mt-6">
          <DashboardRecentTransactions rows={rows} hideViewAll limit={50} />
        </div>
      )}
    </AppShell>
  );
}
