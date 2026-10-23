"use client";

import { Link } from "@tanstack/react-router";
import { FileScan, Plus, UserPlus, Wallet } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

const actions = [
  {
    key: "sale",
    labelKey: "app.dashboard.actions.recordSale",
    icon: Plus,
    iconClass: "bg-emerald-100 text-emerald-700",
    to: "/app/sales" as const,
  },
  {
    key: "expense",
    labelKey: "app.dashboard.actions.recordExpense",
    icon: Wallet,
    iconClass: "bg-violet-100 text-violet-700",
    to: "/app/expenses" as const,
  },
  {
    key: "customer",
    labelKey: "app.dashboard.actions.addCustomer",
    icon: UserPlus,
    iconClass: "bg-amber-100 text-amber-700",
    to: "/app/customers" as const,
  },
  {
    key: "scan",
    labelKey: "app.dashboard.actions.scanDocument",
    icon: FileScan,
    iconClass: "bg-sky-100 text-sky-700",
    to: "/app/scan" as const,
  },
] as const;

export function DashboardQuickActions() {
  const { t } = useTranslation();

  return (
    <div className="mt-6 grid grid-cols-4 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.key}
            to={action.to}
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-2 shadow-sm ring-1 ring-border/60 transition-colors hover:bg-muted/40"
          >
            <span
              className={`flex size-12 items-center justify-center rounded-full ${action.iconClass}`}
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
