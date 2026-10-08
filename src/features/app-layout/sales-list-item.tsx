"use client";

import { User } from "lucide-react";

import { StatusBadge } from "@/features/app-layout/status-badge";
import { formatNgn } from "@/utils/money";
import type { TransactionListItem } from "@/types/database";

const avatarTones = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function SalesListItem({
  row,
  statusCompleted,
  statusPending,
}: {
  row: TransactionListItem;
  statusCompleted: string;
  statusPending: string;
}) {
  const name = row.customers?.name ?? "Walk-in customer";
  const detail = row.description?.trim() || "Sale";
  const tone = avatarTones[name.length % avatarTones.length];
  const pending = row.payment_method === "credit";

  return (
    <li className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone}`}
      >
        <User className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="text-sm font-extrabold tabular-nums">{formatNgn(Number(row.amount))}</p>
        <p className="text-[10px] text-muted-foreground">{formatWhen(row.occurred_at)}</p>
        <StatusBadge
          variant={pending ? "pending" : "completed"}
          label={pending ? statusPending : statusCompleted}
        />
      </div>
    </li>
  );
}
