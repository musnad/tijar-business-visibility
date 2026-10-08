"use client";

import { Link } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";

import { TRANSACTION_TYPE_LABEL_KEYS } from "@/features/transactions/constants";
import { useTranslation } from "@/lib/i18n/context";
import { formatNgn } from "@/utils/money";
import { isMoneyIn } from "@/utils/transaction-math";
import type { TransactionListItem, TransactionType } from "@/types/database";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function rowTitle(row: TransactionListItem, t: (k: string) => string): string {
  const typeLabel = t(TRANSACTION_TYPE_LABEL_KEYS[row.type as TransactionType]);
  if (row.description) return `${typeLabel} — ${row.description}`;
  const party = row.customers?.name ?? row.suppliers?.name;
  if (party) return `${typeLabel} — ${party}`;
  return typeLabel;
}

export function DashboardRecentTransactions({
  rows,
  hideViewAll,
  limit = 5,
}: {
  rows: TransactionListItem[];
  hideViewAll?: boolean;
  limit?: number;
}) {
  const { t } = useTranslation();

  return (
    <section className="mt-6 pb-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">{t("app.dashboard.recentTitle")}</h2>
        {!hideViewAll && (
          <Link to="/app/transactions" className="text-sm font-semibold text-sky-700">
            {t("app.dashboard.viewAll")}
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("app.home.noTransactions")}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.slice(0, limit).map((row) => {
            const incoming = isMoneyIn(row.type);
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ArrowLeftRight className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{rowTitle(row, t)}</p>
                  <p className="text-xs text-muted-foreground">{formatWhen(row.occurred_at)}</p>
                </div>
                <p
                  className={`shrink-0 text-sm font-extrabold tabular-nums ${incoming ? "text-primary" : "text-foreground"}`}
                >
                  {incoming ? "+" : "−"} {formatNgn(Number(row.amount))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
