"use client";

import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import type { TransactionType } from "@/features/transactions/constants";
import { cn } from "@/lib/utils";

export function AppLinkFab({
  to,
  search,
  label,
  className,
}: {
  to: string;
  search?: Record<string, string>;
  label: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={cn(
        "app-fab fixed bottom-[5.25rem] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-amber-700 text-primary-foreground shadow-lg ring-4 ring-background hover:bg-amber-800 sm:right-[max(1rem,calc(50%-15.5rem))]",
        className,
      )}
      aria-label={label}
    >
      <Plus className="size-7 stroke-[2.5]" />
    </Link>
  );
}

export function AppFab({
  recordType,
  label,
}: {
  recordType: Extract<TransactionType, "sale" | "expense">;
  label: string;
}) {
  const isExpense = recordType === "expense";

  return (
    <Link
      to="/app/record"
      search={{ type: recordType }}
      className={cn(
        "app-fab fixed bottom-[5.25rem] right-4 z-40 flex size-14 items-center justify-center rounded-full text-primary-foreground shadow-lg ring-4 ring-background sm:right-[max(1rem,calc(50%-15.5rem))]",
        isExpense ? "bg-violet-700 hover:bg-violet-800" : "bg-primary",
      )}
      aria-label={label}
    >
      <Plus className="size-7 stroke-[2.5]" />
    </Link>
  );
}
