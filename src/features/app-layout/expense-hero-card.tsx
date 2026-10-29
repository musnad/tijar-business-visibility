"use client";

import { Wallet, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Sparkline } from "@/features/app-layout/sparkline";
import { formatNgn } from "@/utils/money";

export function ExpenseHeroCard({
  label,
  amount,
  changePct,
  changeLabel,
  icon: Icon = Wallet,
  sparkline,
  trailing,
}: {
  label: string;
  amount: number;
  changePct: number | null;
  changeLabel: string;
  icon?: LucideIcon;
  sparkline: number[];
  trailing?: ReactNode;
}) {
  return (
    <div className="dashboard-expense-card relative mt-5 overflow-hidden rounded-2xl p-4 text-primary-foreground shadow-lg sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Icon className="size-6" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/85">{label}</p>
          <p className="text-2xl font-extrabold tabular-nums sm:text-[1.75rem]">
            {formatNgn(amount)}
          </p>
          {changePct !== null && (
            <span className="mt-1 inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              {changePct >= 0 ? "↑" : "↓"} {changePct >= 0 ? "+" : ""}
              {changePct}% {changeLabel}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Sparkline points={sparkline} />
          {trailing}
        </div>
      </div>
    </div>
  );
}
