"use client";

import { Link } from "@tanstack/react-router";
import { HandCoins, UserPlus, Wallet } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

const actions = [
  {
    key: "credit",
    labelKey: "app.customers.actionNewCredit",
    icon: HandCoins,
    iconClass: "bg-amber-100 text-amber-800",
    to: "/app/customers/credit/new" as const,
  },
  {
    key: "customer",
    labelKey: "app.customers.actionAddCustomer",
    icon: UserPlus,
    iconClass: "bg-sky-100 text-sky-700",
    to: "/app/customers/new" as const,
  },
  {
    key: "payment",
    labelKey: "app.customers.actionCollect",
    icon: Wallet,
    iconClass: "bg-emerald-100 text-emerald-700",
    to: "/app/record" as const,
    search: { type: "customer_payment" as const },
  },
] as const;

export function CustomerQuickActions() {
  const { t } = useTranslation();

  return (
    <div className="mt-5 grid grid-cols-3 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.key}
            to={action.to}
            {...("search" in action ? { search: action.search } : {})}
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-3 shadow-sm ring-1 ring-border/60 transition-colors hover:bg-muted/40"
          >
            <span
              className={`flex size-11 items-center justify-center rounded-full ${action.iconClass}`}
            >
              <Icon className="size-5" strokeWidth={2.25} />
            </span>
            <span className="text-center text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
              {t(action.labelKey)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
