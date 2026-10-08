"use client";

import { Link } from "@tanstack/react-router";
import { HandCoins, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { CreditHeroCard } from "@/features/app-layout/credit-hero-card";
import { CustomerListItem } from "@/features/app-layout/customer-list-item";
import { MiniStatCard } from "@/features/app-layout/mini-stat-card";
import { Button } from "@/components/ui/button";
import { CustomerActivitySection } from "@/features/customers/customer-activity-section";
import { CustomerQuickActions } from "@/features/customers/customer-quick-actions";
import { useTranslation } from "@/lib/i18n/context";
import { fetchCustomersDashboard } from "@/services/customer-analytics-service";

export function CustomersScreen({ businessId }: { businessId: string }) {
  const { t } = useTranslation();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customers-dashboard", businessId],
    queryFn: async () => {
      const result = await fetchCustomersDashboard(businessId);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
  });

  const labels = {
    owesLabel: t("app.customers.owes"),
    onCreditLabel: t("app.customers.onCreditBadge"),
    paidUpLabel: t("app.customers.paidUpBadge"),
    giveCreditLabel: t("app.customers.giveCredit"),
    recordPaymentLabel: t("app.customers.recordPayment"),
  };

  return (
    <div className="customers-hub pb-6">
      <AppPageHeader title={t("app.customers.title")} subtitle={t("app.customers.pageSubtitle")} />

      <CustomerQuickActions />

      <div className="customers-hub-strip mt-3 flex items-center gap-2 rounded-2xl border border-amber-300/30 px-4 py-2.5 text-xs font-semibold text-amber-950 dark:text-amber-100">
        <HandCoins className="size-4 shrink-0" />
        {t("app.customers.hubHint")}
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}

      {isError && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm font-semibold text-destructive">{t("app.customers.loadError")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : t("app.errors.saveFailed")}
          </p>
          <Button type="button" variant="outline" className="mt-3 rounded-xl" onClick={() => void refetch()}>
            {t("app.common.tryAgain")}
          </Button>
        </div>
      )}

      {data && !isError && (
        <>
          <CreditHeroCard
            label={t("app.customers.totalOwed")}
            amount={data.totalOwed}
            hint={t("app.customers.creditHint")}
            icon={HandCoins}
            sparkline={data.sparkline}
          />

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MiniStatCard
              label={t("app.customers.statTotal")}
              value={String(data.customerCount)}
              icon={Users}
              iconClassName="bg-sky-100 text-sky-700"
              showArrow={false}
            />
            <MiniStatCard
              label={t("app.customers.statOnCredit")}
              value={String(data.owingCount)}
              icon={HandCoins}
              iconClassName="bg-amber-100 text-amber-800"
              showArrow={false}
            />
          </div>

          {data.allCustomers.length === 0 ? (
            <div className="customers-empty-state mt-6 rounded-3xl border border-dashed border-amber-300/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">{t("app.customers.empty")}</p>
              <div className="mt-4 flex flex-col gap-2">
                <Button className="min-h-11 rounded-xl bg-amber-700 font-bold hover:bg-amber-800" asChild>
                  <Link to="/app/customers/new">{t("app.customers.actionAddCustomer")}</Link>
                </Button>
                <Button variant="outline" className="min-h-11 rounded-xl font-bold" asChild>
                  <Link to="/app/customers/credit/new">{t("app.customers.actionNewCredit")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {data.onCredit.length > 0 && (
                <section className="mt-6">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold">{t("app.customers.onCreditTitle")}</h2>
                    <Button variant="link" className="h-auto p-0 text-amber-800" asChild>
                      <Link to="/app/customers/credit/new">{t("app.customers.newCreditShort")}</Link>
                    </Button>
                  </div>
                  <ul className="mt-3 overflow-hidden rounded-2xl border border-amber-200/80 bg-card shadow-sm">
                    {data.onCredit.map((c) => (
                      <CustomerListItem key={c.id} customer={c} {...labels} />
                    ))}
                  </ul>
                </section>
              )}

              {data.onCredit.length === 0 && (
                <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">{t("app.customers.noCredit")}</p>
                  <Button className="mt-3 min-h-11 w-full rounded-xl bg-amber-700 font-bold hover:bg-amber-800" asChild>
                    <Link to="/app/customers/credit/new">{t("app.customers.actionNewCredit")}</Link>
                  </Button>
                </div>
              )}

              {data.paidUp.length > 0 && (
                <section className="mt-6">
                  <h2 className="font-bold">
                    {data.onCredit.length > 0
                      ? t("app.customers.listTitleOthers")
                      : t("app.customers.listTitle")}
                  </h2>
                  <ul className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    {data.paidUp.map((c) => (
                      <CustomerListItem key={c.id} customer={c} {...labels} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {data.allCustomers.length > 0 && <CustomerActivitySection businessId={businessId} />}
        </>
      )}
    </div>
  );
}
