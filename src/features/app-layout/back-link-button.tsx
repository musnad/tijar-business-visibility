"use client";

import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function BackLinkButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm"
    >
      <ChevronLeft className="size-4" />
      {label}
    </Link>
  );
}
