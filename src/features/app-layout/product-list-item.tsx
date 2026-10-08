"use client";

import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/app-layout/status-badge";
import { formatNgn } from "@/utils/money";
import { isLowStock } from "@/utils/stock-math";
import type { Product, ProductSalesStats } from "@/types/database";

export function ProductListItem({
  product,
  stats,
  lowStockLabel,
  inStockLabel,
  serviceLabel,
  adjustStockLabel,
  profitLabel,
  lossLabel,
  salesCountLabel,
  costShortLabel,
  perJobLabel,
}: {
  product: Product;
  stats?: ProductSalesStats;
  lowStockLabel: string;
  inStockLabel: string;
  serviceLabel: string;
  adjustStockLabel: string;
  profitLabel: string;
  lossLabel: string;
  salesCountLabel: string;
  costShortLabel: string;
  perJobLabel: string;
}) {
  const kind = product.kind ?? "goods";
  const qty = Number(product.stock_quantity);
  const low = kind === "goods" && isLowStock(qty, Number(product.low_stock_threshold));
  const price = product.sale_price != null ? Number(product.sale_price) : null;
  const cost = product.cost_price != null ? Number(product.cost_price) : null;
  const unitMargin = price != null && cost != null ? price - cost : null;

  return (
    <li className="border-b border-border px-3 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
            <Package className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {kind === "service" ? serviceLabel : `${qty} ${product.unit}`}
            {price != null ? ` · ${formatNgn(price)}` : ""}
            {cost != null ? ` · ${costShortLabel} ${formatNgn(cost)}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {kind === "service" ? (
              <StatusBadge variant="completed" label={serviceLabel} />
            ) : (
              <StatusBadge
                variant={low ? "pending" : "completed"}
                label={low ? lowStockLabel : inStockLabel}
              />
            )}
            {unitMargin !== null && (
              <span
                className={`text-xs font-semibold tabular-nums ${
                  unitMargin >= 0 ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {unitMargin >= 0 ? profitLabel : lossLabel}: {formatNgn(Math.abs(unitMargin))}
                {kind === "service" ? ` ${perJobLabel}` : `/${product.unit}`}
              </span>
            )}
          </div>
          {stats && stats.saleCount > 0 && (
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              {salesCountLabel.replace("{count}", String(stats.saleCount))} ·{" "}
              {stats.profit >= 0 ? profitLabel : lossLabel}{" "}
              {formatNgn(Math.abs(stats.profit))}
            </p>
          )}
        </div>
      </div>
      {kind === "goods" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 min-h-10 w-full rounded-xl font-semibold"
          asChild
        >
          <Link to="/app/products/adjust" search={{ productId: product.id }}>
            {adjustStockLabel}
          </Link>
        </Button>
      )}
    </li>
  );
}
