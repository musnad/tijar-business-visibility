"use client";

import { BarChart3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useTranslation } from "@/lib/i18n/context";
import { formatNgnCompact } from "@/utils/money";
import { percentChange } from "@/utils/transaction-math";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(160 45% 42%)",
  },
};

export function BusinessOverviewCard({
  sales,
  expenses,
  profit,
  previousSales,
  previousExpenses,
  previousProfit,
  daily,
}: {
  sales: number;
  expenses: number;
  profit: number;
  previousSales: number;
  previousExpenses: number;
  previousProfit: number;
  daily: { label: string; sales: number }[];
}) {
  const { t } = useTranslation();
  const salesPct = percentChange(sales, previousSales);
  const expensesPct = percentChange(expenses, previousExpenses);
  const profitPct = percentChange(profit, previousProfit);

  const chartData =
    daily.length > 0
      ? daily
      : [{ label: "—", sales: 0 }];

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <h2 className="font-bold">{t("app.dashboard.overviewTitle")}</h2>
        </div>
        <span className="rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          {t("app.dashboard.last30Days")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <StatPill
          label={t("app.dashboard.statSales")}
          value={formatNgnCompact(sales)}
          pct={salesPct}
        />
        <StatPill
          label={t("app.dashboard.statExpenses")}
          value={formatNgnCompact(expenses)}
          pct={expensesPct}
        />
        <StatPill
          label={t("app.dashboard.statProfit")}
          value={formatNgnCompact(profit)}
          pct={profitPct}
          highlight
        />
      </div>

      <ChartContainer config={chartConfig} className="mt-4 h-[180px] w-full aspect-auto">
        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-sales)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-sales)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatNgnCompact(Number(v))}
            width={48}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="var(--color-sales)"
            strokeWidth={2}
            fill="url(#salesFill)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function StatPill({
  label,
  value,
  pct,
  highlight,
}: {
  label: string;
  value: string;
  pct: number | null;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "rounded-lg bg-primary/5 py-2" : "py-2"}>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-extrabold tabular-nums">{value}</p>
      {pct !== null && (
        <p className="text-[10px] font-semibold text-primary">↑ {Math.abs(pct)}%</p>
      )}
    </div>
  );
}
