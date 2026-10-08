"use client";

import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/features/app-layout/form-section";
import { BusinessLogoField } from "@/features/business/business-logo-field";
import { businessProfileFormSchema } from "@/features/business/schemas";
import { categoryDisplayName } from "@/features/onboarding/category-label";
import { useTranslation } from "@/lib/i18n/context";
import { uploadBusinessLogo } from "@/services/business-logo-service";
import { listBusinessCategories, updateBusinessProfile } from "@/services/business-service";
import type { Business } from "@/types/database";

export function EditBusinessForm({ business }: { business: Business }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [businessName, setBusinessName] = useState(business.business_name);
  const [location, setLocation] = useState(business.location ?? "");
  const [description, setDescription] = useState(business.description ?? "");
  const [categoryId, setCategoryId] = useState(business.category_id ?? "");
  const [islamicMode, setIslamicMode] = useState(business.islamic_mode_enabled);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const result = await listBusinessCategories();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });

  const logoPreview =
    logoCleared && !logoFile ? null : business.logo_url && !logoCleared ? business.logo_url : null;

  async function submit() {
    const parsed = businessProfileFormSchema.safeParse({
      businessName,
      location,
      description: description || undefined,
      categoryId: categoryId || undefined,
      islamicModeEnabled: islamicMode,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? t("app.errors.validation"));
      return;
    }

    setSaving(true);
    let logoUrl: string | null | undefined = undefined;
    if (logoCleared && !logoFile) {
      logoUrl = null;
    }
    if (logoFile) {
      const uploaded = await uploadBusinessLogo(business.id, logoFile);
      if (uploaded.error || !uploaded.publicUrl) {
        setSaving(false);
        toast.error(uploaded.error ?? t("app.errors.saveFailed"));
        return;
      }
      logoUrl = uploaded.publicUrl;
    }

    const { business: updated, error } = await updateBusinessProfile(business.id, {
      businessName: parsed.data.businessName,
      location: parsed.data.location,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      islamicModeEnabled: parsed.data.islamicModeEnabled,
      logoUrl,
    });
    setSaving(false);

    if (error || !updated) {
      toast.error(error ?? t("app.errors.saveFailed"));
      return;
    }

    toast.success(t("app.business.saved"));
    await queryClient.invalidateQueries({ queryKey: ["primary-business"] });
    void navigate({ to: "/app/business" });
  }

  return (
    <div className="mt-5 space-y-4 pb-8">
      <div className="dashboard-summary-card rounded-2xl p-4 shadow-lg sm:p-5">
        <BusinessLogoField
          previewUrl={logoPreview}
          onFile={(file) => {
            setLogoFile(file);
            setLogoCleared(false);
          }}
          onClear={() => {
            setLogoFile(null);
            setLogoCleared(true);
          }}
        />
        <Input
          className="mt-4 min-h-12 border-0 bg-white/10 text-lg font-bold text-primary-foreground placeholder:text-white/40"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder={t("app.business.namePlaceholder")}
        />
        <Input
          className="mt-3 min-h-12 border-0 bg-white/10 text-sm text-primary-foreground placeholder:text-white/40"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("app.business.locationPlaceholder")}
        />
      </div>

      <FormSection title={t("app.business.aboutSection")} hint={t("app.business.aboutHint")}>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("app.business.descriptionPlaceholder")}
        />
      </FormSection>

      <FormSection title={t("app.business.categorySection")} hint={t("app.business.categoryHint")}>
        <Select value={categoryId || undefined} onValueChange={setCategoryId}>
          <SelectTrigger className="min-h-12 w-full rounded-xl">
            <SelectValue placeholder={t("app.business.categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {categoryDisplayName(cat, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormSection>

      <FormSection title={t("app.business.islamicSection")} hint={t("app.business.islamicHint")}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIslamicMode(true)}
            className={`flex-1 rounded-xl border py-3 text-sm font-bold ${
              islamicMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {t("app.common.yes")}
          </button>
          <button
            type="button"
            onClick={() => setIslamicMode(false)}
            className={`flex-1 rounded-xl border py-3 text-sm font-bold ${
              !islamicMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {t("app.common.no")}
          </button>
        </div>
      </FormSection>

      <Button
        type="button"
        className="min-h-12 w-full rounded-xl text-base font-bold"
        disabled={saving}
        onClick={() => void submit()}
      >
        {t("app.business.save")}
      </Button>
    </div>
  );
}
