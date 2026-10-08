"use client";

import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { formatNgn } from "@/utils/money";

export function CreditSummaryCard({
  customerCreditTotal,
  supplierCreditTotal,
  customersOwingCount,
  suppliersOwingCount,
}: {
  customerCreditTotal: number;
  supplierCreditTotal: number;
  customersOwingCount: number;
  suppliersOwingCount: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      <Link
        to="/app/customers"
        className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 shadow-sm transition-colors hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
          <ArrowDownLeft className="size-4" />
          {t("app.health.creditInTitle")}
        </div>
        <p className="mt-2 text-lg font-extrabold tabular-nums text-amber-950 dark:text-amber-100">
          {formatNgn(customerCreditTotal)}
        </p>
        <p className="mt-1 text-[10px] font-medium text-amber-800/80 dark:text-amber-300/80">
          {customersOwingCount === 1
            ? t("app.health.creditInHintOne")
            : t("app.health.creditInHintMany").replace("{count}", String(customersOwingCount))}
        </p>
      </Link>

      <Link
        to="/app/suppliers"
        className="rounded-2xl border border-violet-200/80 bg-violet-50/80 p-4 shadow-sm transition-colors hover:bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/30"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-900 dark:text-violet-200">
          <ArrowUpRight className="size-4" />
          {t("app.health.creditOutTitle")}
        </div>
        <p className="mt-2 text-lg font-extrabold tabular-nums text-violet-950 dark:text-violet-100">
          {formatNgn(supplierCreditTotal)}
        </p>
        <p className="mt-1 text-[10px] font-medium text-violet-800/80 dark:text-violet-300/80">
          {suppliersOwingCount === 1
            ? t("app.health.creditOutHintOne")
            : t("app.health.creditOutHintMany").replace("{count}", String(suppliersOwingCount))}
        </p>
      </Link>
    </div>
  );
}
