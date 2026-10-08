"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MiniStatCard({
  label,
  value,
  changePct,
  icon: Icon,
  iconClassName,
  onClick,
  showArrow,
}: {
  label: string;
  value: ReactNode;
  changePct?: number | null;
  icon: LucideIcon;
  iconClassName: string;
  onClick?: () => void;
  showArrow?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-w-[7.25rem] flex-1 flex-col rounded-2xl border border-border bg-card p-3 text-left shadow-sm",
        onClick && "transition-colors hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "mb-2 flex size-9 items-center justify-center rounded-full",
          iconClassName,
        )}
      >
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">{value}</p>
      {changePct !== null && changePct !== undefined ? (
        <p className="mt-1 text-[10px] font-bold text-primary">
          {changePct >= 0 ? "↑" : "↓"} {changePct >= 0 ? "+" : ""}
          {changePct}%
        </p>
      ) : (
        (showArrow || onClick) && (
          <ChevronRight className="mt-1 size-4 text-muted-foreground" />
        )
      )}
    </Comp>
  );
}
