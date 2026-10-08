import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/features/app/app-shell";
import { RequireAuth } from "@/features/app/require-auth";
import { BusinessOverviewCard } from "@/features/dashboard/business-overview";
import { DashboardHero } from "@/features/dashboard/dashboard-hero";
import { LearnGrowBanner } from "@/features/dashboard/learn-banner";
import { CreditSummaryCard } from "@/features/dashboard/credit-summary-card";
import { DashboardQuickActions } from "@/features/dashboard/quick-actions";
import { HealthInsightsCard } from "@/features/dashboard/health-insights-card";
import { DashboardRecentTransactions } from "@/features/dashboard/recent-transactions";
import { DashboardSummaryCard } from "@/features/dashboard/summary-card";
import { fetchBusinessHealthDashboard } from "@/services/business-health-service";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";
import { fetchPeriodAnalytics, listRecentTransactions } from "@/services/transaction-service";

export const Route = createFileRoute("/app/")({
  component: AppHomePage,
});

function AppHomePage() {
  return (
    <RequireAuth>
      <AppHomeContent />
    </RequireAuth>
  );
}

function AppHomeContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: businessData, isLoading } = usePrimaryBusiness(profile?.id);
  const business = businessData?.business;

  const { data: analytics } = useQuery({
    queryKey: ["period-analytics", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const result = await fetchPeriodAnalytics(business!.id, 30);
      if (result.error) throw new Error(result.error);
      return result;
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-transactions", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const result = await listRecentTransactions(business!.id, 8);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });

  const { data: health } = useQuery({
    queryKey: ["business-health", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const result = await fetchBusinessHealthDashboard(business!.id, 30, t);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <AppShell>
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}

      {business && (
        <>
          <DashboardHero firstName={firstName} business={business} />
          <DashboardSummaryCard
            sales={analytics?.current.sales ?? 0}
            expenses={analytics?.current.expenses ?? 0}
            previousSales={analytics?.previous.sales ?? 0}
            previousExpenses={analytics?.previous.expenses ?? 0}
          />
          {health && (
            <CreditSummaryCard
              customerCreditTotal={health.customerCreditTotal}
              supplierCreditTotal={health.supplierCreditTotal}
              customersOwingCount={health.customersOwingCount}
              suppliersOwingCount={health.suppliersOwingCount}
            />
          )}
          <DashboardQuickActions />
          {health && business && (
            <HealthInsightsCard
              businessId={business.id}
              healthScore={health.healthScore}
              healthBand={health.healthBand}
              recommendations={health.recommendations}
            />
          )}
          <BusinessOverviewCard
            sales={analytics?.current.sales ?? 0}
            expenses={analytics?.current.expenses ?? 0}
            profit={analytics?.current.profit ?? 0}
            previousSales={analytics?.previous.sales ?? 0}
            previousExpenses={analytics?.previous.expenses ?? 0}
            previousProfit={analytics?.previous.profit ?? 0}
            daily={analytics?.daily ?? []}
          />
          <LearnGrowBanner />
          <DashboardRecentTransactions rows={recent} />
        </>
      )}

      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
    </AppShell>
  );
}
