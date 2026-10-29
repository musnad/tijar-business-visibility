"use client";

import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/features/app-layout/form-section";
import { useTranslation } from "@/lib/i18n/context";
import { listProducts } from "@/services/product-service";
import type { Product } from "@/types/database";
import { saleLineTotals, unitCost } from "@/utils/product-profit";
import { formatNgn } from "@/utils/money";

export function SaleProductPicker({
  businessId,
  productId,
  quantity,
  onProductId,
  onQuantity,
  onSuggestedAmount,
}: {
  businessId: string;
  productId: string;
  quantity: string;
  onProductId: (id: string) => void;
  onQuantity: (q: string) => void;
  onSuggestedAmount: (amount: string) => void;
}) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    void listProducts(businessId).then(({ data }) => setProducts(data));
  }, [businessId]);

  const selected = products.find((p) => p.id === productId);

  const profitPreview = useMemo(() => {
    if (!selected) return null;
    const q = Number.parseFloat(quantity.replace(/,/g, "")) || 1;
    const unitPrice =
      selected.sale_price != null ? Number(selected.sale_price) : 0;
    if (unitPrice <= 0) return null;
    return saleLineTotals(unitPrice, unitCost(selected), q);
  }, [selected, quantity]);

  useEffect(() => {
    if (!selected?.sale_price) return;
    const q = Number.parseFloat(quantity.replace(/,/g, "")) || 1;
    const total = Number(selected.sale_price) * q;
    if (total > 0) onSuggestedAmount(String(total));
  }, [selected, quantity, onSuggestedAmount]);

  return (
    <FormSection title={t("app.sales.productSection")} hint={t("app.sales.productHint")}>
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("app.sales.noProducts")}</p>
      ) : (
        <div className="grid max-h-48 gap-2 overflow-y-auto">
          {products.map((p) => {
            const active = productId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onProductId(active ? "" : p.id)}
                className={`flex items-center gap-3 rounded-xl border p-2 text-left ${
                  active ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border"
                }`}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="size-12 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                    <Package className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(p.kind ?? "goods") === "service"
                      ? t("app.products.kindService")
                      : `${Number(p.stock_quantity)} ${p.unit}`}
                    {p.sale_price != null ? ` · ${formatNgn(Number(p.sale_price))}` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {selected && (selected.kind ?? "goods") === "goods" && (
        <Input
          className="mt-3 min-h-12 rounded-xl"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => onQuantity(e.target.value)}
          placeholder={t("app.sales.quantityPlaceholder")}
        />
      )}
      {profitPreview && (
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          {t("app.sales.profitPreview")}:{" "}
          <span className={profitPreview.profit >= 0 ? "text-primary" : "text-red-700"}>
            {formatNgn(profitPreview.profit)}
          </span>
          {" · "}
          {t("app.sales.costPreview")}: {formatNgn(profitPreview.cost)}
        </p>
      )}
      <Button type="button" variant="link" className="mt-2 h-auto p-0 text-primary" asChild>
        <Link to="/app/products/new">{t("app.sales.addProductLink")}</Link>
      </Button>
    </FormSection>
  );
}
