"use client";

import { cn } from "@/lib/utils";

export function MultiSelectOption({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}

export function YesNoChoice({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MultiSelectOption label={yesLabel} selected={value === true} onToggle={() => onChange(true)} />
      <MultiSelectOption label={noLabel} selected={value === false} onToggle={() => onChange(false)} />
    </div>
  );
}
