"use client";

import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mic, Square } from "lucide-react";
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

type FieldErrors = Partial<Record<"name" | "salePrice" | "costPrice" | "initialStock" | "lowStockThreshold", string>>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const { listen, stop, listening, supported } = useSpeechRecognition();

  const speakLang =
    locale === "yo" ? "Yoruba" : locale === "sw" ? "Swahili" : locale === "ha" ? "Hausa" : "English";

  const cost = costPrice ? Number.parseFloat(costPrice.replace(/[₦,\s]/g, "").replace(/k$/i, "000")) : 0;
  const sale = salePrice ? Number.parseFloat(salePrice.replace(/[₦,\s]/g, "").replace(/k$/i, "000")) : 0;
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
      setFieldErrors({});
      setVoiceHint(transcript);
      toast.success(t("app.products.voiceFilled"));
      void speakText(t("app.products.voiceFilledSpeak"), speakLang);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.products.voiceFailed"));
    }
  }

  async function submit() {
    setFieldErrors({});
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
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          key === "name" ||
          key === "salePrice" ||
          key === "costPrice" ||
          key === "initialStock" ||
          key === "lowStockThreshold"
        ) {
          if (!next[key]) next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      toast.error(parsed.error.issues[0]?.message ?? t("app.errors.validation"));
      return;
    }

    setSaving(true);
    try {
      const { product, error } = await createProduct(businessId, profileId, parsed.data);
      if (error && !product) {
        toast.error(error);
        return;
      }
      if (error && product) {
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

      if (!product) {
        toast.error(t("app.errors.saveFailed"));
        return;
      }

      toast.success(t("app.products.saved"), {
        description: product.name,
        icon: <CheckCircle2 className="size-4" />,
      });
      await invalidateBusinessQueries(queryClient, businessId);
      void navigate({ to: "/app/products" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 space-y-4 pb-28">
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
              "flex-1 rounded-xl py-2.5 text-xs font-bold",
              kind === "goods" ? "bg-white/20 ring-2 ring-white/50" : "bg-white/10",
            )}
          >
            {t("app.products.kindGoods")}
          </button>
          <button
            type="button"
            onClick={() => setKind("service")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-xs font-bold",
              kind === "service" ? "bg-white/20 ring-2 ring-white/50" : "bg-white/10",
            )}
          >
            {t("app.products.kindService")}
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/75">
            {t("app.products.nameSection")} *
          </span>
          <Input
            className={cn(
              "min-h-12 border-0 bg-white/10 text-lg font-bold text-primary-foreground placeholder:text-white/40",
              fieldErrors.name && "ring-2 ring-red-300",
            )}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }));
            }}
            placeholder={t("app.products.namePlaceholder")}
            autoComplete="off"
            autoFocus
          />
          {fieldErrors.name && <p className="mt-1 text-xs font-semibold text-red-100">{fieldErrors.name}</p>}
          <p className="mt-1 text-xs text-white/65">{t("app.products.nameHint")}</p>
        </label>
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
          className={cn("min-h-12 rounded-xl", fieldErrors.costPrice && "ring-2 ring-destructive")}
          inputMode="decimal"
          value={costPrice}
          onChange={(e) => {
            setCostPrice(e.target.value);
            if (fieldErrors.costPrice) setFieldErrors((f) => ({ ...f, costPrice: undefined }));
          }}
          placeholder={
            kind === "service"
              ? t("app.products.serviceCostPlaceholder")
              : t("app.products.costPricePlaceholder")
          }
        />
        {fieldErrors.costPrice && (
          <p className="mt-1 text-xs font-semibold text-destructive">{fieldErrors.costPrice}</p>
        )}
        <Input
          className={cn("mt-3 min-h-12 rounded-xl", fieldErrors.salePrice && "ring-2 ring-destructive")}
          inputMode="decimal"
          value={salePrice}
          onChange={(e) => {
            setSalePrice(e.target.value);
            if (fieldErrors.salePrice) setFieldErrors((f) => ({ ...f, salePrice: undefined }));
          }}
          placeholder={t("app.products.salePricePlaceholder")}
        />
        {fieldErrors.salePrice && (
          <p className="mt-1 text-xs font-semibold text-destructive">{fieldErrors.salePrice}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t("app.products.priceFormatHint")}</p>
        {previewProfit !== null && Number.isFinite(previewProfit) && (
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
            className={cn("min-h-12 rounded-xl", fieldErrors.initialStock && "ring-2 ring-destructive")}
            inputMode="decimal"
            value={initialStock}
            onChange={(e) => {
              setInitialStock(e.target.value);
              if (fieldErrors.initialStock) setFieldErrors((f) => ({ ...f, initialStock: undefined }));
            }}
            placeholder={t("app.products.initialStockPlaceholder")}
          />
          {fieldErrors.initialStock && (
            <p className="mt-1 text-xs font-semibold text-destructive">{fieldErrors.initialStock}</p>
          )}
          <Input
            className={cn(
              "mt-3 min-h-12 rounded-xl",
              fieldErrors.lowStockThreshold && "ring-2 ring-destructive",
            )}
            inputMode="decimal"
            value={lowThreshold}
            onChange={(e) => {
              setLowThreshold(e.target.value);
              if (fieldErrors.lowStockThreshold) {
                setFieldErrors((f) => ({ ...f, lowStockThreshold: undefined }));
              }
            }}
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

      <FormSection title={t("app.products.photoSection")} hint={t("app.products.photoHint")}>
        <div className="flex justify-center rounded-2xl bg-muted/40 p-4">
          <ProductPhotoField
            previewUrl={null}
            onFile={setImageFile}
            onClear={() => setImageFile(null)}
          />
        </div>
      </FormSection>

      <FormSection title={t("app.products.notesSection")} hint={t("app.products.notesHint")}>
        <Input
          className="min-h-12 rounded-xl"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("app.products.notesPlaceholder")}
        />
      </FormSection>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t border-border bg-background/95 p-3 backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button
          type="button"
          className="min-h-12 w-full rounded-xl bg-teal-700 text-base font-bold shadow-md hover:bg-teal-800"
          disabled={saving || !name.trim()}
          onClick={() => void submit()}
        >
          {saving ? t("app.products.saving") : t("app.products.add")}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground sm:mt-3">
          {t("app.products.saveHint")}
        </p>
      </div>
    </div>
  );
}
