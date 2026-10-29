"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { HandCoins } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { recordTransactionSchema } from "@/features/transactions/schemas";
import { useTranslation } from "@/lib/i18n/context";
import { listCustomers } from "@/services/customer-service";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { createTransaction } from "@/services/transaction-service";
import type { Customer } from "@/types/database";
import { formatNgn } from "@/utils/money";

export function NewCreditForm({
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void listCustomers(businessId).then(({ data }) => setCustomers(data));
  }, [businessId]);

  useEffect(() => {
    if (initialCustomerId) setCustomerId(initialCustomerId);
  }, [initialCustomerId]);

  const selected = customers.find((c) => c.id === customerId);
  const balance = selected ? Number(selected.balance_owed) : 0;

  async function submit() {
    const parsed = recordTransactionSchema.safeParse({
      type: "sale",
      amount,
      description: description || undefined,
      paymentMethod: "credit",
      customerId: customerId || undefined,
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
    toast.success(t("app.customers.creditSaved"));
    await invalidateBusinessQueries(queryClient, businessId);
    void navigate({ to: "/app/customers" });
  }

  if (customers.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-sm">
        <HandCoins className="mx-auto size-10 text-primary" strokeWidth={2} />
        <p className="mt-3 text-sm font-semibold">{t("app.customers.creditNeedCustomerTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.customers.creditNeedCustomerBody")}</p>
        <Button className="mt-4 min-h-11 w-full rounded-xl font-bold" asChild>
          <Link to="/app/customers/new">{t("app.customers.add")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4 pb-4">
      <div className="dashboard-credit-card rounded-2xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <HandCoins className="size-6" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-bold text-primary-foreground">{t("app.customers.creditBadge")}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/80">{t("app.customers.creditFormHero")}</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-white/85">{t("app.customers.creditAmountLabel")}</p>
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
        <p className="mt-2 text-xs text-white/70">{t("app.customers.creditAmountHint")}</p>
      </div>

      <FormSection title={t("app.record.customer")} hint={t("app.customers.creditCustomerHint")}>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="min-h-12 rounded-xl bg-background">
            <SelectValue placeholder={t("app.customers.creditChooseCustomer")} />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {Number(c.balance_owed) > 0 ? ` — ${formatNgn(Number(c.balance_owed))}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <p className="mt-2 text-xs text-muted-foreground">
            {balance > 0
              ? `${t("app.customers.currentBalance")}: ${formatNgn(balance)}`
              : t("app.customers.noBalanceYet")}
          </p>
        )}
        <Button type="button" variant="link" className="mt-1 h-auto p-0 text-primary" asChild>
          <Link to="/app/customers/new">{t("app.sales.addCustomerLink")}</Link>
        </Button>
      </FormSection>

      <FormSection title={t("app.customers.creditWhatTitle")} hint={t("app.customers.creditWhatHint")}>
        <Input
          className="min-h-12 rounded-xl"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("app.customers.creditWhatPlaceholder")}
        />
      </FormSection>

      <Button
        type="button"
        className="min-h-12 w-full rounded-xl bg-primary text-base font-bold shadow-md hover:bg-primary/90"
        disabled={submitting || !customerId}
        onClick={() => void submit()}
      >
        {t("app.customers.saveCredit")}
      </Button>
    </div>
  );
}
