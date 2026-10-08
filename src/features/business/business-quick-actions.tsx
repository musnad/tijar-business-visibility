"use client";

import { Link } from "@tanstack/react-router";
import { Truck, Users } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

const actions = [
  {
    key: "customers",
    labelKey: "app.business.manageCustomers",
    icon: Users,
    iconClass: "bg-sky-100 text-sky-700",
    to: "/app/customers" as const,
  },
  {
    key: "suppliers",
    labelKey: "app.business.manageSuppliers",
    icon: Truck,
    iconClass: "bg-violet-100 text-violet-700",
    to: "/app/suppliers" as const,
  },
] as const;

export function BusinessQuickActions() {
  const { t } = useTranslation();

  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.key}
            to={action.to}
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border/60 transition-colors hover:bg-muted/40"
          >
            <span
              className={`flex size-11 items-center justify-center rounded-full ${action.iconClass}`}
            >
              <Icon className="size-5" strokeWidth={2.25} />
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-foreground">
              {t(action.labelKey)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
