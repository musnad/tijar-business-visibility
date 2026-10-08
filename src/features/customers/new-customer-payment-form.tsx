"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { PaymentMethodPicker } from "@/features/transactions/payment-method-picker";
import type { PaymentMethodId } from "@/features/transactions/constants";
import { recordTransactionSchema } from "@/features/transactions/schemas";
import { useTranslation } from "@/lib/i18n/context";
import { listCustomers } from "@/services/customer-service";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { createTransaction } from "@/services/transaction-service";
import type { Customer } from "@/types/database";
import { formatNgn } from "@/utils/money";

export function NewCustomerPaymentForm({
  businessId,
  profileId,
  initialCustomerId,
}: {
  businessId: string;
  profileId: string;
  initialCustomerId?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | "">("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void listCustomers(businessId).then(({ data }) => setCustomers(data));
  }, [businessId]);

  useEffect(() => {
    if (initialCustomerId) setCustomerId(initialCustomerId);
  }, [initialCustomerId]);

  const owingCustomers = useMemo(
    () => customers.filter((c) => Number(c.balance_owed) > 0),
    [customers],
  );

  useEffect(() => {
    if (!customerId && owingCustomers.length === 1) {
      setCustomerId(owingCustomers[0]!.id);
    }
  }, [customerId, owingCustomers]);

  const selected = customers.find((c) => c.id === customerId);
  const balance = selected ? Number(selected.balance_owed) : 0;

  async function submit() {
    const parsed = recordTransactionSchema.safeParse({
      type: "customer_payment",
      amount,
      description: description || undefined,
      paymentMethod: paymentMethod || undefined,
      customerId: customerId || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? t("app.errors.validation"));
      return;
    }
    if (balance <= 0) {
      toast.error(t("app.customers.paymentNoBalance"));
      return;
    }
    if (parsed.data.amount > balance) {
      toast.error(t("app.customers.paymentTooMuch").replace("{max}", formatNgn(balance)));
      return;
    }
    setSubmitting(true);
    const { error } = await createTransaction(businessId, profileId, parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("app.customers.paymentSaved"));
    await invalidateBusinessQueries(queryClient, businessId);
    void navigate({ to: "/app/customers" });
  }

  if (customers.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-sm">
        <Wallet className="mx-auto size-10 text-emerald-700" strokeWidth={2} />
        <p className="mt-3 text-sm font-semibold">{t("app.customers.paymentNeedCustomerTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.customers.paymentNeedCustomerBody")}</p>
        <Button className="mt-4 min-h-11 w-full rounded-xl font-bold" asChild>
          <Link to="/app/customers/new">{t("app.customers.add")}</Link>
        </Button>
      </div>
    );
  }

  if (owingCustomers.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-semibold">{t("app.customers.paymentNothingOwedTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.customers.paymentNothingOwedBody")}</p>
        <Button className="mt-4 min-h-11 w-full rounded-xl bg-amber-700 font-bold hover:bg-amber-800" asChild>
          <Link to="/app/customers/credit/new">{t("app.customers.actionNewCredit")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4 pb-4">
      <div className="dashboard-credit-card rounded-2xl p-4 shadow-lg">
        <p className="text-sm font-medium text-white/85">{t("app.customers.paymentAmountLabel")}</p>
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
        {selected && balance > 0 && (
          <>
            <p className="mt-2 text-xs text-white/75">
              {t("app.customers.stillOwes")}: {formatNgn(balance)}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 rounded-lg text-xs font-bold"
              onClick={() => setAmount(String(balance))}
            >
              {t("app.customers.payFullBalance")}
            </Button>
          </>
        )}
      </div>

      <FormSection title={t("app.record.customer")} hint={t("app.customers.paymentCustomerHint")}>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="min-h-12 rounded-xl bg-background">
            <SelectValue placeholder={t("app.customers.paymentChooseOwing")} />
          </SelectTrigger>
          <SelectContent>
            {owingCustomers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} — {formatNgn(Number(c.balance_owed))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormSection>

      <FormSection title={t("app.record.paymentMethod")} hint={t("app.customers.paymentMethodHint")}>
        <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} excludeCredit />
      </FormSection>

      <FormSection title={t("app.record.note")} hint={t("app.customers.paymentNoteHint")}>
        <Input
          className="min-h-12 rounded-xl"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("app.customers.paymentNotePlaceholder")}
        />
      </FormSection>

      <Button
        type="button"
        className="min-h-12 w-full rounded-xl text-base font-bold shadow-md"
        disabled={submitting || !customerId}
        onClick={() => void submit()}
      >
        {t("app.customers.savePayment")}
      </Button>
    </div>
  );
}
