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
        className="rounded-2xl border border-primary/25 bg-accent p-4 shadow-sm transition-colors hover:bg-accent dark:border-primary/30 dark:bg-primary/15"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground dark:text-primary">
          <ArrowDownLeft className="size-4" />
          {t("app.health.creditInTitle")}
        </div>
        <p className="mt-2 text-lg font-extrabold tabular-nums text-foreground dark:text-primary-foreground">
          {formatNgn(customerCreditTotal)}
        </p>
        <p className="mt-1 text-[10px] font-medium text-primary/80 dark:text-secondary/80">
          {customersOwingCount === 1
            ? t("app.health.creditInHintOne")
            : t("app.health.creditInHintMany").replace("{count}", String(customersOwingCount))}
        </p>
      </Link>

      <Link
        to="/app/suppliers"
        className="rounded-2xl border border-primary/25 bg-accent p-4 shadow-sm transition-colors hover:bg-accent dark:border-primary/30 dark:bg-primary/15"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground dark:text-primary">
          <ArrowUpRight className="size-4" />
          {t("app.health.creditOutTitle")}
        </div>
        <p className="mt-2 text-lg font-extrabold tabular-nums text-foreground dark:text-primary-foreground">
          {formatNgn(supplierCreditTotal)}
        </p>
        <p className="mt-1 text-[10px] font-medium text-primary/80 dark:text-primary/80">
          {suppliersOwingCount === 1
            ? t("app.health.creditOutHintOne")
            : t("app.health.creditOutHintMany").replace("{count}", String(suppliersOwingCount))}
        </p>
      </Link>
    </div>
  );
}
