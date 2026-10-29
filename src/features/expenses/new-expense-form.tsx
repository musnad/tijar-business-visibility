"use client";

import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/features/app-layout/form-section";
import { PaymentMethodPicker } from "@/features/transactions/payment-method-picker";
import type { PaymentMethodId } from "@/features/transactions/constants";
import { recordTransactionSchema } from "@/features/transactions/schemas";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { useTranslation } from "@/lib/i18n/context";
import { useQueryClient } from "@tanstack/react-query";
import { createTransaction } from "@/services/transaction-service";

const expenseCategories = [
  "rent",
  "transport",
  "utilities",
  "supplies",
  "salary",
  "other",
] as const;

export function NewExpenseForm({
  businessId,
  profileId,
}: {
  businessId: string;
  profileId: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof expenseCategories)[number] | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | "">("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const note =
      description.trim() ||
      (category ? t(`app.expenses.categories.${category}`) : undefined);
    const parsed = recordTransactionSchema.safeParse({
      type: "expense",
      amount,
      description: note,
      paymentMethod: paymentMethod || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? t("app.errors.validation"));
      return;
    }
    setSubmitting(true);
    const { error } = await createTransaction(businessId, profileId, parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("app.expenses.savedToast"));
    await invalidateBusinessQueries(queryClient, businessId);
    void navigate({ to: "/app/expenses" });
  }

  return (
    <div className="mt-5 space-y-4 pb-4">
      <div className="dashboard-expense-card rounded-2xl p-4 shadow-lg">
        <p className="text-sm font-medium text-white/85">{t("app.expenses.amountLabel")}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl font-extrabold text-primary-foreground">₦</span>
          <Input
            className="h-14 border-0 bg-white/10 text-2xl font-extrabold text-primary-foreground shadow-none placeholder:text-white/40 focus-visible:ring-white/30"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <p className="mt-2 text-xs text-white/70">{t("app.expenses.amountHint")}</p>
      </div>

      <FormSection title={t("app.expenses.categoryTitle")} hint={t("app.expenses.categoryHint")}>
        <div className="flex flex-wrap gap-2">
          {expenseCategories.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory((c) => (c === id ? "" : id))}
              className={
                category === id
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  : "rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              }
            >
              {t(`app.expenses.categories.${id}`)}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title={t("app.record.paymentMethod")} hint={t("app.expenses.paymentHint")}>
        <PaymentMethodPicker
          value={paymentMethod}
          onChange={setPaymentMethod}
          excludeCredit
        />
      </FormSection>

      <FormSection title={t("app.expenses.noteTitle")} hint={t("app.expenses.noteHint")}>
        <Input
          className="min-h-12 rounded-xl"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("app.expenses.notePlaceholder")}
        />
      </FormSection>

      <Button
        type="button"
        className="min-h-12 w-full rounded-xl bg-foreground text-base font-bold text-white shadow-md hover:bg-foreground/90"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {t("app.expenses.saveExpense")}
      </Button>
    </div>
  );
}
