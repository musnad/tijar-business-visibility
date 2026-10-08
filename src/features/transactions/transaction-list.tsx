"use client";

import { TRANSACTION_TYPE_LABEL_KEYS } from "@/features/transactions/constants";
import { useTranslation } from "@/lib/i18n/context";
import { formatNgn } from "@/utils/money";
import type { TransactionListItem, TransactionType } from "@/types/database";

export function TransactionList({ rows }: { rows: TransactionListItem[] }) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("app.home.noTransactions")}</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {rows.map((row) => {
        const party = row.customers?.name ?? row.suppliers?.name;
        const typeKey = TRANSACTION_TYPE_LABEL_KEYS[row.type as TransactionType];
        return (
          <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-semibold">{t(typeKey)}</p>
              {party && <p className="text-muted-foreground">{party}</p>}
              {row.description && (
                <p className="text-xs text-muted-foreground">{row.description}</p>
              )}
            </div>
            <p className="shrink-0 font-bold tabular-nums">{formatNgn(Number(row.amount))}</p>
          </li>
        );
      })}
    </ul>
  );
}
