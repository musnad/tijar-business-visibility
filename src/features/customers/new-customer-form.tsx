"use client";

import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/features/app-layout/form-section";
import { customerFormSchema } from "@/features/transactions/schemas";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { useTranslation } from "@/lib/i18n/context";
import { createCustomer } from "@/services/customer-service";

export function NewCustomerForm({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(thenCredit: boolean) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error(t("app.customers.nameRequired"));
      return;
    }
    const parsed = customerFormSchema.safeParse({
      name: trimmed,
      phone: phone || undefined,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? t("app.errors.validation"));
      return;
    }
    setSaving(true);
    const { customer, error } = await createCustomer(businessId, parsed.data);
    setSaving(false);
    if (error || !customer) {
      toast.error(error ?? t("app.errors.saveFailed"));
      return;
    }
    toast.success(t("app.customers.saved"));
    await invalidateBusinessQueries(queryClient, businessId);
    if (thenCredit) {
      void navigate({
        to: "/app/customers/credit/new",
        search: { customerId: customer.id },
      });
      return;
    }
    void navigate({ to: "/app/customers" });
  }

  return (
    <div className="mt-5 space-y-4 pb-4">
      <div className="dashboard-credit-card rounded-2xl p-4 shadow-lg">
        <p className="text-sm font-medium text-white/85">{t("app.customers.addHero")}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/75">{t("app.customers.addHeroBody")}</p>
      </div>

      <FormSection title={t("app.customers.contactSection")} hint={t("app.customers.contactHint")}>
        <Input
          className="min-h-12 rounded-xl"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("app.customers.namePlaceholder")}
          autoComplete="name"
        />
        <Input
          className="mt-3 min-h-12 rounded-xl"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("app.customers.phonePlaceholder")}
          autoComplete="tel"
        />
      </FormSection>

      <FormSection title={t("app.customers.notesSection")} hint={t("app.customers.notesHint")}>
        <Input
          className="min-h-12 rounded-xl"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("app.customers.notesPlaceholder")}
        />
      </FormSection>

      <Button
        type="button"
        className="min-h-12 w-full rounded-xl bg-amber-700 text-base font-bold shadow-md hover:bg-amber-800"
        disabled={saving}
        onClick={() => void save(true)}
      >
        {t("app.customers.addAndCredit")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-12 w-full rounded-xl text-base font-bold"
        disabled={saving}
        onClick={() => void save(false)}
      >
        {t("app.customers.add")}
      </Button>
    </div>
  );
}
