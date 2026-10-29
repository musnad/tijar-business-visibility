"use client";

import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/features/app-layout/form-section";
import { stockAdjustSchema } from "@/features/products/schemas";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { useTranslation } from "@/lib/i18n/context";
import { adjustStock } from "@/services/product-service";
import type { Product } from "@/types/database";

const reasons = ["purchase", "sale", "adjustment", "return"] as const;

export function StockAdjustForm({
  businessId,
  profileId,
  product,
}: {
  businessId: string;
  profileId: string;
  product: Product;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<(typeof reasons)[number]>("purchase");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const parsed = stockAdjustSchema.safeParse({
      direction,
      quantity,
      reason,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? t("app.errors.validation"));
      return;
    }
    setSubmitting(true);
    const { error } = await adjustStock(businessId, profileId, product.id, parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("app.products.stockSaved"));
    await invalidateBusinessQueries(queryClient, businessId);
    void navigate({ to: "/app/products" });
  }

  return (
    <div className="mt-5 space-y-4 pb-4">
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-bold">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {t("app.products.currentStock")}: {Number(product.stock_quantity)} {product.unit}
        </p>
      </div>

      <FormSection title={t("app.products.adjustDirection")} hint={t("app.products.adjustDirectionHint")}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection("in")}
            className={`min-h-11 rounded-xl text-sm font-bold ${
              direction === "in" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {t("app.products.stockIn")}
          </button>
          <button
            type="button"
            onClick={() => setDirection("out")}
            className={`min-h-11 rounded-xl text-sm font-bold ${
              direction === "out" ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            {t("app.products.stockOut")}
          </button>
        </div>
      </FormSection>

      <FormSection title={t("app.products.quantitySection")}>
        <Input
          className="min-h-12 rounded-xl"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
        />
      </FormSection>

      <FormSection title={t("app.products.reasonSection")}>
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                reason === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t(`app.products.reasons.${r}`)}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title={t("app.products.notesSection")}>
        <Input
          className="min-h-12 rounded-xl"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("app.products.adjustNotePlaceholder")}
        />
      </FormSection>

      <Button
        type="button"
        className="min-h-12 w-full rounded-xl text-base font-bold shadow-md"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {t("app.products.saveAdjust")}
      </Button>
    </div>
  );
}
