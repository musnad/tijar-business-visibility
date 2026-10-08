"use client";

import { ChevronRight, HandCoins, type LucideIcon } from "lucide-react";

import { Sparkline } from "@/features/app-layout/sparkline";
import { formatNgn } from "@/utils/money";

export function CreditHeroCard({
  label,
  amount,
  hint,
  icon: Icon = HandCoins,
  sparkline,
}: {
  label: string;
  amount: number;
  hint?: string;
  icon?: LucideIcon;
  sparkline: number[];
}) {
  return (
    <div className="dashboard-credit-card relative mt-5 overflow-hidden rounded-2xl p-4 text-primary-foreground shadow-lg sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Icon className="size-6" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/85">{label}</p>
          <p className="text-2xl font-extrabold tabular-nums sm:text-[1.75rem]">
            {formatNgn(amount)}
          </p>
          {hint && <p className="mt-1 text-xs text-white/75">{hint}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Sparkline points={sparkline} />
          <ChevronRight className="size-5 text-white/70" />
        </div>
      </div>
    </div>
  );
}
