"use client";

import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/features/app-layout/form-section";
import { ProductPhotoField } from "@/features/products/product-photo-field";
import { productFormSchema } from "@/features/products/schemas";
import { speakText, useSpeechRecognition } from "@/features/translate/use-speech";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { uploadProductImage } from "@/services/product-image-service";
import { createProduct, updateProductImageUrl } from "@/services/product-service";
import type { ProductKind } from "@/types/database";
import { saleLineTotals } from "@/utils/product-profit";
import { formatNgn } from "@/utils/money";
import { parseVoiceProduct } from "@/utils/voice-product";

const goodsUnits = ["piece", "bag", "carton", "kg", "litre"] as const;

export function NewProductForm({
  businessId,
  profileId,
}: {
  businessId: string;
  profileId: string;
}) {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ProductKind>("goods");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<(typeof goodsUnits)[number]>("piece");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [lowThreshold, setLowThreshold] = useState("5");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const { listen, stop, listening, supported } = useSpeechRecognition();

  const speakLang =
    locale === "yo" ? "Yoruba" : locale === "sw" ? "Swahili" : locale === "ha" ? "Hausa" : "English";

  const cost = costPrice ? Number.parseFloat(costPrice.replace(/,/g, "")) : 0;
  const sale = salePrice ? Number.parseFloat(salePrice.replace(/,/g, "")) : 0;
  const previewProfit =
    sale > 0 ? saleLineTotals(sale, Number.isFinite(cost) ? cost : 0, 1).profit : null;

  async function onVoice() {
    setVoiceHint(null);
    try {
      const transcript = await listen(speakLang);
      if (!transcript.trim()) return;
      const draft = parseVoiceProduct(transcript);
      if (!draft.name) {
        toast.message(t("app.products.voiceNeedName"));
        setVoiceHint(transcript);
        return;
      }
      setName(draft.name);
      setKind(draft.kind);
      if (draft.kind === "goods" && goodsUnits.includes(draft.unit as (typeof goodsUnits)[number])) {
        setUnit(draft.unit as (typeof goodsUnits)[number]);
      }
      if (draft.salePrice) setSalePrice(draft.salePrice);
      if (draft.costPrice) setCostPrice(draft.costPrice);
      if (draft.initialStock) setInitialStock(draft.initialStock);
      setVoiceHint(transcript);
      toast.success(t("app.products.voiceFilled"));
      void speakText(t("app.products.voiceFilledSpeak"), speakLang);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.products.voiceFailed"));
    }
  }

  async function submit() {
    const parsed = productFormSchema.safeParse({
      name,
      kind,
      unit: kind === "service" ? "job" : unit,
      salePrice: salePrice || undefined,
      costPrice: costPrice || undefined,
      initialStock: kind === "goods" ? initialStock || undefined : undefined,
      lowStockThreshold: kind === "goods" ? lowThreshold || undefined : undefined,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? t("app.errors.validation"));
      return;
    }
    setSaving(true);
    const { product, error } = await createProduct(businessId, profileId, parsed.data);
    if (error && !product) {
      setSaving(false);
      toast.error(error);
      return;
    }
    if (error && product) {
      // Saved with a stock warning
      toast.message(error);
    }

    if (product && imageFile) {
      const uploaded = await uploadProductImage(businessId, product.id, imageFile);
      if (uploaded.publicUrl) {
        await updateProductImageUrl(product.id, uploaded.publicUrl);
      } else if (uploaded.error) {
        toast.message(uploaded.error);
      }
    }

    setSaving(false);
    if (!product) {
      toast.error(t("app.errors.saveFailed"));
      return;
    }
    toast.success(t("app.products.saved"));
    await invalidateBusinessQueries(queryClient, businessId);
    void navigate({ to: "/app/products" });
  }

  return (
    <div className="mt-5 space-y-4 pb-4">
      {/* Voice add */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-bold">{t("app.products.voiceTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("app.products.voiceHint")}</p>
        <div className="mt-3 flex gap-2">
          {supported &&
            (listening ? (
              <Button type="button" variant="destructive" className="min-h-12 flex-1 rounded-xl font-bold" onClick={stop}>
                <Square className="mr-1.5 size-4" /> {t("app.products.voiceStop")}
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-12 flex-1 rounded-xl bg-teal-700 font-bold hover:bg-teal-800"
                onClick={() => void onVoice()}
              >
                <Mic className="mr-1.5 size-4" /> {t("app.products.voiceAdd")}
              </Button>
            ))}
        </div>
        {voiceHint && (
          <p className="mt-2 rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
            “{voiceHint}”
          </p>
        )}
      </div>

      <div className="dashboard-summary-card rounded-2xl p-4 shadow-lg sm:p-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("goods")}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-bold",
              kind === "goods" ? "bg-white/20 ring-2 ring-white/50" : "bg-white/10",
            )}
          >
            {t("app.products.kindGoods")}
          </button>
          <button
            type="button"
            onClick={() => setKind("service")}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-bold",
              kind === "service" ? "bg-white/20 ring-2 ring-white/50" : "bg-white/10",
            )}
          >
            {t("app.products.kindService")}
          </button>
        </div>
        <ProductPhotoField
          previewUrl={null}
          onFile={setImageFile}
          onClear={() => setImageFile(null)}
        />
        <Input
          className="mt-4 min-h-12 border-0 bg-white/10 text-lg font-bold text-primary-foreground placeholder:text-white/40"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("app.products.namePlaceholder")}
        />
      </div>

      <FormSection
        title={kind === "service" ? t("app.products.serviceCostSection") : t("app.products.pricingSection")}
        hint={
          kind === "service"
            ? t("app.products.serviceCostHint")
            : t("app.products.pricingHintFull")
        }
      >
        <Input
          className="min-h-12 rounded-xl"
          inputMode="decimal"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          placeholder={
            kind === "service"
              ? t("app.products.serviceCostPlaceholder")
              : t("app.products.costPricePlaceholder")
          }
        />
        <Input
          className="mt-3 min-h-12 rounded-xl"
          inputMode="decimal"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          placeholder={t("app.products.salePricePlaceholder")}
        />
        {previewProfit !== null && (
          <p
            className={cn(
              "mt-2 text-xs font-semibold",
              previewProfit >= 0 ? "text-emerald-700" : "text-red-700",
            )}
          >
            {previewProfit >= 0
              ? t("app.products.profitPerUnit")
              : t("app.products.lossPerUnit")}
            : {formatNgn(Math.abs(previewProfit))}
          </p>
        )}
      </FormSection>

      {kind === "goods" && (
        <FormSection title={t("app.products.stockSection")} hint={t("app.products.stockHint")}>
          <Input
            className="min-h-12 rounded-xl"
            inputMode="decimal"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            placeholder={t("app.products.initialStockPlaceholder")}
          />
          <Input
            className="mt-3 min-h-12 rounded-xl"
            inputMode="decimal"
            value={lowThreshold}
            onChange={(e) => setLowThreshold(e.target.value)}
            placeholder={t("app.products.lowStockPlaceholder")}
          />
        </FormSection>
      )}

      {kind === "goods" && (
        <FormSection title={t("app.products.unitSection")}>
          <div className="flex flex-wrap gap-2">
            {goodsUnits.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  unit === u ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {t(`app.products.units.${u}`)}
              </button>
            ))}
          </div>
        </FormSection>
      )}

      <FormSection title={t("app.products.notesSection")} hint={t("app.products.notesHint")}>
        <Input
          className="min-h-12 rounded-xl"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("app.products.notesPlaceholder")}
        />
      </FormSection>

      <Button
        type="button"
        className="min-h-12 w-full rounded-xl bg-teal-700 text-base font-bold shadow-md hover:bg-teal-800"
        disabled={saving || !name.trim()}
        onClick={() => void submit()}
      >
        {saving ? t("app.products.saving") : t("app.products.add")}
      </Button>
    </div>
  );
}
