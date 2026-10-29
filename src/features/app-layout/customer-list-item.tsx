"use client";

import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/app-layout/status-badge";
import { formatNgn } from "@/utils/money";
import type { Customer } from "@/types/database";

const avatarTones = [
  "bg-primary/10 text-primary",
  "bg-primary/10 text-primary",
  "bg-primary/10 text-primary",
  "bg-primary/15 text-primary",
];

export function CustomerListItem({
  customer,
  owesLabel,
  onCreditLabel,
  paidUpLabel,
  giveCreditLabel,
  recordPaymentLabel,
}: {
  customer: Customer;
  owesLabel: string;
  onCreditLabel: string;
  paidUpLabel: string;
  giveCreditLabel: string;
  recordPaymentLabel: string;
}) {
  const owed = Number(customer.balance_owed);
  const onCredit = owed > 0;
  const tone = avatarTones[customer.name.length % avatarTones.length];

  return (
    <li className="border-b border-border px-3 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone}`}
        >
          <User className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{customer.name}</p>
          {(customer.email || customer.phone) && (
            <p className="truncate text-xs text-muted-foreground">
              {[customer.email, customer.phone].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge
              variant={onCredit ? "pending" : "completed"}
              label={onCredit ? onCreditLabel : paidUpLabel}
            />
          </div>
        </div>
        {onCredit && (
          <p className="shrink-0 text-right">
            <span className="block text-[10px] font-semibold text-muted-foreground">{owesLabel}</span>
            <span className="text-sm font-extrabold tabular-nums text-foreground">{formatNgn(owed)}</span>
          </p>
        )}
      </div>

      <div className={`mt-3 grid gap-2 ${onCredit ? "grid-cols-2" : "grid-cols-1"}`}>
        <Button
          type="button"
          variant={onCredit ? "outline" : "default"}
          size="sm"
          className={
            onCredit
              ? "min-h-10 rounded-xl font-semibold"
              : "min-h-10 rounded-xl bg-primary font-semibold hover:bg-primary/90"
          }
          asChild
        >
          <Link
            to="/app/customers/credit/new"
            search={{ customerId: customer.id }}
          >
            {giveCreditLabel}
          </Link>
        </Button>
        {onCredit && (
          <Button
            type="button"
            size="sm"
            className="min-h-10 rounded-xl font-semibold"
            asChild
          >
            <Link
              to="/app/record"
              search={{ type: "customer_payment", customerId: customer.id }}
            >
              {recordPaymentLabel}
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}
