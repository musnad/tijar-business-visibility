"use client";

import { Link } from "@tanstack/react-router";
import { FileScan, Plus, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useTranslation } from "@/lib/i18n/context";

const actions = [
  {
    key: "sale",
    labelKey: "app.dashboard.actions.recordSale",
    icon: Plus,
    iconClass: "bg-emerald-100 text-emerald-700",
    to: "/app/sales" as const,
    search: undefined,
  },
  {
    key: "expense",
    labelKey: "app.dashboard.actions.recordExpense",
    icon: Wallet,
    iconClass: "bg-violet-100 text-violet-700",
    to: "/app/expenses" as const,
    search: undefined,
  },
  {
    key: "customer",
    labelKey: "app.dashboard.actions.addCustomer",
    icon: UserPlus,
    iconClass: "bg-amber-100 text-amber-700",
    to: "/app/customers" as const,
    search: undefined,
  },
  {
    key: "scan",
    labelKey: "app.dashboard.actions.scanDocument",
    icon: FileScan,
    iconClass: "bg-sky-100 text-sky-700",
    to: null,
    search: undefined,
  },
] as const;

export function DashboardQuickActions() {
  const { t } = useTranslation();

  return (
    <div className="mt-6 grid grid-cols-4 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        const inner = (
          <>
            <span
              className={`flex size-12 items-center justify-center rounded-full ${action.iconClass}`}
            >
              <Icon className="size-5" strokeWidth={2.25} />
            </span>
            <span className="text-center text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
              {t(action.labelKey)}
            </span>
          </>
        );

        if (!action.to) {
          return (
            <button
              key={action.key}
              type="button"
              className="flex flex-col items-center gap-2 rounded-xl bg-card p-2 shadow-sm ring-1 ring-border/60"
              onClick={() => toast.message(t("app.dashboard.scanSoon"))}
            >
              {inner}
            </button>
          );
        }

        return (
          <Link
            key={action.key}
            to={action.to}
            {...("search" in action && action.search ? { search: action.search } : {})}
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-2 shadow-sm ring-1 ring-border/60 transition-colors hover:bg-muted/40"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
