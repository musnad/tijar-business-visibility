"use client";

import { Link } from "@tanstack/react-router";
import { Plus, ShoppingCart, ShoppingBag, Users, Package } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { HeroMetricCard } from "@/features/app-layout/hero-metric-card";
import { MiniStatCard } from "@/features/app-layout/mini-stat-card";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { PeriodFilter } from "@/features/app-layout/period-filter";
import { SalesListItem } from "@/features/app-layout/sales-list-item";
import { useTranslation } from "@/lib/i18n/context";
import {
  fetchSalesDashboard,
  type SalesPeriod,
} from "@/services/sales-analytics-service";
import { formatNgn } from "@/utils/money";

export function RecordSalesScreen({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<SalesPeriod>("month");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["sales-dashboard", businessId, period],
    queryFn: async () => {
      const result = await fetchSalesDashboard(businessId, period);
      if (result.error) throw new Error(result.error);
      return result;
    },
  });

  const spark = data?.sparkline.map((d) => d.sales) ?? [];
  const changeLabel =
    period === "month" ? t("app.dashboard.vsLastMonth") : t("app.sales.vsPrevious30d");

  return (
    <div className="sales-hub pb-6">
      <AppPageHeader
        title={t("app.sales.title")}
        subtitle={t("app.sales.subtitle")}
        action={<PeriodFilter value={period} onChange={setPeriod} />}
      />

      <div className="sales-hub-strip mt-3 flex items-center gap-2 rounded-2xl border border-primary/15 px-4 py-2.5 text-xs font-semibold text-primary">
        <ShoppingCart className="size-4 shrink-0" />
        {t("app.sales.hubHint")}
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}

      {isError && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm font-semibold text-destructive">{t("app.sales.loadError")}</p>
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
          <HeroMetricCard
            label={t("app.dashboard.totalSales")}
            amount={data.totalSales}
            changePct={data.salesChangePct}
            changeLabel={changeLabel}
            icon={ShoppingCart}
            sparkline={spark}
            trailing={null}
          />

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MiniStatCard
              label={t("app.sales.totalOrders")}
              value={String(data.orderCount)}
              changePct={data.ordersChangePct}
              icon={ShoppingBag}
              iconClassName="bg-primary/15 text-primary"
            />
            <MiniStatCard
              label={t("app.sales.averageOrder")}
              value={formatNgn(data.averageOrder)}
              changePct={data.averageChangePct}
              icon={ShoppingCart}
              iconClassName="bg-primary/10 text-primary"
            />
            <MiniStatCard
              label={t("app.sales.totalCustomers")}
              value={String(data.customerCount)}
              changePct={data.customersChangePct}
              icon={Users}
              iconClassName="bg-primary/10 text-primary"
            />
            <MiniStatCard
              label={t("app.sales.topProduct")}
              value={data.topProduct}
              icon={Package}
              iconClassName="bg-primary/10 text-primary"
              showArrow={false}
            />
          </div>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">{t("app.sales.recentTitle")}</h2>
              <Link to="/app/transactions" className="text-sm font-semibold text-primary">
                {t("app.dashboard.viewAll")}
              </Link>
            </div>
            {data.recentSales.length === 0 ? (
              <div className="sales-empty-state mt-4 rounded-3xl border border-dashed border-primary/25 p-6 text-center">
                <p className="text-sm text-muted-foreground">{t("app.sales.empty")}</p>
                <Button className="mt-4 min-h-11 rounded-2xl font-bold shadow-md" asChild>
                  <Link to="/app/record" search={{ type: "sale" }}>
                    <Plus className="mr-2 size-4" />
                    {t("app.sales.newSale")}
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {data.recentSales.map((row) => (
                  <SalesListItem
                    key={row.id}
                    row={row}
                    statusCompleted={t("app.sales.statusCompleted")}
                    statusPending={t("app.sales.statusPending")}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
