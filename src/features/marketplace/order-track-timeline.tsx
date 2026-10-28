"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  orderStatusLabel,
  orderTrackIndex,
  orderTrackSteps,
} from "@/utils/order-tracking";

export function OrderTrackTimeline({
  status,
  fulfilment,
  compact = false,
}: {
  status: string;
  fulfilment: string;
  compact?: boolean;
}) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive">
        {orderStatusLabel(status)}
      </p>
    );
  }

  const steps = orderTrackSteps(fulfilment);
  const current = orderTrackIndex(status, fulfilment);

  if (compact) {
    return (
      <div className="mt-2">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="rounded-full bg-primary transition-all"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs font-semibold text-primary">{orderStatusLabel(status)}</p>
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs font-bold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-primary/15 text-primary",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {i < steps.length - 1 && (
                <span
                  className={cn("my-0.5 w-0.5 flex-1 min-h-4", done ? "bg-primary" : "bg-border")}
                />
              )}
            </div>
            <div className={cn("pb-4 pt-0.5", i === steps.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-bold",
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              {active && (
                <p className="text-xs text-muted-foreground">{orderStatusLabel(status)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
