"use client";

import { Receipt } from "lucide-react";

import {
  PAYMENT_METHOD_LABEL_KEYS,
  type PaymentMethodId,
} from "@/features/transactions/constants";
import { useTranslation } from "@/lib/i18n/context";
import { formatNgn } from "@/utils/money";
import type { TransactionListItem } from "@/types/database";

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

export function ExpenseListItem({ row }: { row: TransactionListItem }) {
  const { t } = useTranslation();
  const title = row.description?.trim() || t("app.record.types.expense");
  const methodKey =
    row.payment_method && row.payment_method in PAYMENT_METHOD_LABEL_KEYS
      ? PAYMENT_METHOD_LABEL_KEYS[row.payment_method as PaymentMethodId]
      : null;
  const methodLabel = methodKey ? t(methodKey) : "—";

  return (
    <li className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
        <Receipt className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{methodLabel}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p className="text-sm font-extrabold tabular-nums text-foreground">
          − {formatNgn(Number(row.amount))}
        </p>
        <p className="text-[10px] text-muted-foreground">{formatWhen(row.occurred_at)}</p>
      </div>
    </li>
  );
}
