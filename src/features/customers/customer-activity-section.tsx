"use client";

import { useQuery } from "@tanstack/react-query";

import { formatNgn } from "@/utils/money";
import { useTranslation } from "@/lib/i18n/context";
import { listCustomerCreditActivity } from "@/services/customer-activity-service";
import type { TransactionListItem } from "@/types/database";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function activityLabel(row: TransactionListItem, t: (k: string) => string): string {
  const name = row.customers?.name?.trim() || t("app.customers.unnamedCustomer");
  if (row.type === "customer_payment") {
    return `${t("app.customers.activityPayment")} · ${name}`;
  }
  const detail = row.description?.trim();
  return detail
    ? `${t("app.customers.activityCredit")} · ${name} — ${detail}`
    : `${t("app.customers.activityCredit")} · ${name}`;
}

export function CustomerActivitySection({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-activity", businessId],
    queryFn: async () => {
      const result = await listCustomerCreditActivity(businessId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });

  return (
    <section className="mt-6">
      <h2 className="font-bold">{t("app.customers.activityTitle")}</h2>
      {isLoading && <p className="mt-3 text-sm text-muted-foreground">…</p>}
      {!isLoading && data && data.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{t("app.customers.activityEmpty")}</p>
      )}
      {!isLoading && data && data.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {data.map((row) => {
            const incoming = row.type === "customer_payment";
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{activityLabel(row, t)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatWhen(row.occurred_at)}</p>
                </div>
                <p
                  className={`shrink-0 text-sm font-extrabold tabular-nums ${
                    incoming ? "text-emerald-700" : "text-amber-800"
                  }`}
                >
                  {incoming ? "+" : ""}
                  {formatNgn(Number(row.amount))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
