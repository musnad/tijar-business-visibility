"use client";

import { TrendingUp, Wallet } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { formatNgn } from "@/utils/money";
import { percentChange } from "@/utils/transaction-math";

export function DashboardSummaryCard({
  sales,
  expenses,
  previousSales,
  previousExpenses,
}: {
  sales: number;
  expenses: number;
  previousSales: number;
  previousExpenses: number;
}) {
  const { t } = useTranslation();
  const salesPct = percentChange(sales, previousSales);
  const expensesPct = percentChange(expenses, previousExpenses);

  return (
    <div className="dashboard-summary-card mt-5 grid grid-cols-2 gap-0 overflow-hidden rounded-2xl text-primary-foreground shadow-lg">
      <div className="border-r border-white/15 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-white/85">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
            <TrendingUp className="size-4" />
          </span>
          {t("app.dashboard.totalSales")}
        </div>
        <p className="mt-3 text-2xl font-extrabold tabular-nums sm:text-[1.65rem]">
          {formatNgn(sales)}
        </p>
        {salesPct !== null && (
          <p className="mt-1 text-xs font-semibold text-secondary">
            ↑ {Math.abs(salesPct)}% {t("app.dashboard.vsLastMonth")}
          </p>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-white/85">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
            <Wallet className="size-4" />
          </span>
          {t("app.dashboard.totalExpenses")}
        </div>
        <p className="mt-3 text-2xl font-extrabold tabular-nums sm:text-[1.65rem]">
          {formatNgn(expenses)}
        </p>
        {expensesPct !== null && (
          <p className="mt-1 text-xs font-semibold text-secondary">
            ↑ {Math.abs(expensesPct)}% {t("app.dashboard.vsLastMonth")}
          </p>
        )}
      </div>
    </div>
  );
}
