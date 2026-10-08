"use client";

import type { ReactNode } from "react";

export function AppPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-1 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </div>
  );
}
