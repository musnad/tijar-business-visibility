"use client";

import { Link } from "@tanstack/react-router";
import { Plus, Receipt, TrendingDown, Wallet } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { ExpenseHeroCard } from "@/features/app-layout/expense-hero-card";
import { ExpenseListItem } from "@/features/app-layout/expense-list-item";
import { MiniStatCard } from "@/features/app-layout/mini-stat-card";
import { PeriodFilter } from "@/features/app-layout/period-filter";
import { useTranslation } from "@/lib/i18n/context";
import { fetchExpenseDashboard } from "@/services/expense-analytics-service";
import type { SalesPeriod } from "@/services/sales-analytics-service";
import { formatNgn } from "@/utils/money";

export function RecordExpensesScreen({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<SalesPeriod>("month");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["expense-dashboard", businessId, period],
    queryFn: async () => {
      const result = await fetchExpenseDashboard(businessId, period);
      if (result.error) throw new Error(result.error);
      return result;
    },
  });

  const spark = data?.sparkline.map((d) => d.amount) ?? [];
  const changeLabel =
    period === "month" ? t("app.dashboard.vsLastMonth") : t("app.expenses.vsPrevious30d");

  return (
    <div className="expenses-hub pb-6">
      <AppPageHeader
        title={t("app.expenses.title")}
        subtitle={t("app.expenses.subtitle")}
        action={<PeriodFilter value={period} onChange={setPeriod} />}
      />

      <div className="expenses-hub-strip mt-3 flex items-center gap-2 rounded-2xl border border-violet-300/25 px-4 py-2.5 text-xs font-semibold text-violet-900 dark:text-violet-100">
        <Receipt className="size-4 shrink-0" />
        {t("app.expenses.hubHint")}
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}

      {isError && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm font-semibold text-destructive">{t("app.expenses.loadError")}</p>
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
          <ExpenseHeroCard
            label={t("app.dashboard.totalExpenses")}
            amount={data.totalExpenses}
            changePct={data.expensesChangePct}
            changeLabel={changeLabel}
            icon={Wallet}
            sparkline={spark}
          />

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MiniStatCard
              label={t("app.expenses.countLabel")}
              value={String(data.expenseCount)}
              changePct={data.countChangePct}
              icon={Receipt}
              iconClassName="bg-violet-100 text-violet-700"
            />
            <MiniStatCard
              label={t("app.expenses.averageLabel")}
              value={formatNgn(data.averageExpense)}
              changePct={data.averageChangePct}
              icon={TrendingDown}
              iconClassName="bg-sky-100 text-sky-700"
            />
            <MiniStatCard
              label={t("app.expenses.topCategoryLabel")}
              value={data.topCategory}
              icon={Wallet}
              iconClassName="bg-amber-100 text-amber-800"
              showArrow={false}
            />
          </div>

          <section className="mt-6 pb-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">{t("app.expenses.recentTitle")}</h2>
              <Link to="/app/transactions" className="text-sm font-semibold text-violet-700">
                {t("app.dashboard.viewAll")}
              </Link>
            </div>
            {data.recentExpenses.length === 0 ? (
              <div className="expenses-empty-state mt-4 rounded-3xl border border-dashed border-violet-300/35 p-6 text-center">
                <p className="text-sm text-muted-foreground">{t("app.expenses.empty")}</p>
                <Button
                  className="mt-4 min-h-11 rounded-2xl bg-violet-700 font-bold shadow-md hover:bg-violet-800"
                  asChild
                >
                  <Link to="/app/record" search={{ type: "expense" }}>
                    <Plus className="mr-2 size-4" />
                    {t("app.expenses.newExpense")}
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {data.recentExpenses.map((row) => (
                  <ExpenseListItem key={row.id} row={row} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
