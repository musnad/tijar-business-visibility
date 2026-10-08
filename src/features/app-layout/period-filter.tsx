"use client";

import { CalendarDays, ChevronDown } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SalesPeriod } from "@/services/sales-analytics-service";
import { useTranslation } from "@/lib/i18n/context";

export function PeriodFilter({
  value,
  onChange,
}: {
  value: SalesPeriod;
  onChange: (v: SalesPeriod) => void;
}) {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={(v) => onChange(v as SalesPeriod)}>
      <SelectTrigger className="h-10 min-w-[8.5rem] rounded-xl border-border bg-card px-2 text-xs font-semibold shadow-sm">
        <CalendarDays className="mr-1 size-3.5 text-muted-foreground" />
        <SelectValue />
        <ChevronDown className="ml-1 size-3.5 opacity-50" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="month">{t("app.sales.periodMonth")}</SelectItem>
        <SelectItem value="30d">{t("app.sales.period30d")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
