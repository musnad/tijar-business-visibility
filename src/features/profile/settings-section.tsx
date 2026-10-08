"use client";

import type { ReactNode } from "react";

export function SettingsSection({
  title,
  hint,
  children,
  variant = "default",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <section
      className={
        variant === "danger"
          ? "rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-4 shadow-sm"
          : "rounded-2xl border border-border bg-card p-4 shadow-sm"
      }
    >
      <h2 className={`text-sm font-bold ${variant === "danger" ? "text-destructive" : "text-foreground"}`}>
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
