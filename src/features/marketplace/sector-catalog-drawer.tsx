"use client";

import { LayoutGrid, Menu } from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MARKETPLACE_SECTORS } from "@/features/marketplace/marketplace-sectors";
import { cn } from "@/lib/utils";

export function SectorCatalogDrawer({
  sectorFilter,
  onSelect,
  counts,
}: {
  sectorFilter: string;
  onSelect: (key: string) => void;
  counts: Map<string, number>;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
          aria-label="Open business sectors catalog"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[min(100%,320px)] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="size-4 text-primary" />
            Business sectors
          </SheetTitle>
          <p className="text-xs text-muted-foreground">Browse by informal trade</p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <SheetClose asChild>
            <button
              type="button"
              onClick={() => onSelect("")}
              className={cn(
                "mb-2 w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold",
                !sectorFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              All businesses
            </button>
          </SheetClose>
          <ul className="space-y-1">
            {MARKETPLACE_SECTORS.map((sector) => {
              const Icon = sector.icon;
              const active = sectorFilter === sector.key;
              const count = counts.get(sector.key) ?? 0;
              return (
                <li key={sector.key}>
                  <SheetClose asChild>
                    <button
                      type="button"
                      onClick={() => onSelect(sector.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                        active ? "bg-primary/10" : "hover:bg-muted",
                      )}
                    >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: sector.tint }}
                    >
                      <Icon className="size-4 text-foreground/80" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight">{sector.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{sector.hint}</p>
                    </span>
                    <span className="tabular-nums text-[11px] font-semibold text-muted-foreground">
                      {count}
                    </span>
                    </button>
                  </SheetClose>
                </li>
              );
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
