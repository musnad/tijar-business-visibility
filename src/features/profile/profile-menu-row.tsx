"use client";

import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function ProfileMenuRow({
  icon: Icon,
  title,
  subtitle,
  to,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </>
  );

  const className =
    "flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-b-0 transition-colors hover:bg-muted/30";

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  );
}
