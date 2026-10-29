"use client";

import { cn } from "@/lib/utils";

export function StatusBadge({
  variant,
  label,
}: {
  variant: "completed" | "pending";
  label: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
        variant === "completed" && "bg-primary/15 text-primary",
        variant === "pending" && "bg-primary/10 text-primary",
      )}
    >
      {label}
    </span>
  );
}
