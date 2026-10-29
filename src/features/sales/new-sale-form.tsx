"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
import { SaleProductPicker } from "@/features/sales/sale-product-picker";
import { PaymentMethodPicker } from "@/features/transactions/payment-method-picker";
import type { PaymentMethodId } from "@/features/transactions/constants";
import { recordTransactionSchema } from "@/features/transactions/schemas";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { useTranslation } from "@/lib/i18n/context";
import { useQueryClient } from "@tanstack/react-query";
import { listCustomers } from "@/services/customer-service";
import { createTransaction } from "@/services/transaction-service";
import type { Customer } from "@/types/database";

export function NewSaleForm({
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | "">("");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const onSuggestedAmount = useCallback((value: string) => {
    setAmount(value);
  }, []);

  useEffect(() => {
    void listCustomers(businessId).then(({ data }) => setCustomers(data));
  }, [businessId]);

  const creditSale = paymentMethod === "credit";

  async function submit() {
    const parsed = recordTransactionSchema.safeParse({
      type: "sale",
      amount,
      description: description || undefined,
      paymentMethod: paymentMethod || undefined,
      customerId: customerId || undefined,
      productId: productId || undefined,
      quantity: productId ? quantity : undefined,
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
    toast.success(t("app.sales.savedToast"));
    await invalidateBusinessQueries(queryClient, businessId);
    void navigate({ to: "/app/sales" });
  }

  return (
    <div className="mt-5 space-y-4 pb-4">
      <SaleProductPicker
        businessId={businessId}
        productId={productId}
        quantity={quantity}
        onProductId={setProductId}
        onQuantity={setQuantity}
        onSuggestedAmount={onSuggestedAmount}
      />

      <div className="dashboard-summary-card rounded-2xl p-4 shadow-lg">
        <p className="text-sm font-medium text-white/85">{t("app.sales.amountLabel")}</p>
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
        <p className="mt-2 text-xs text-white/70">{t("app.sales.amountHint")}</p>
      </div>

      <FormSection title={t("app.record.paymentMethod")} hint={t("app.sales.paymentHint")}>
        <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
      </FormSection>

      <FormSection
        title={t("app.record.customer")}
        hint={creditSale ? t("app.sales.customerRequiredCredit") : t("app.sales.customerOptional")}
      >
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="min-h-12 rounded-xl bg-background">
            <SelectValue placeholder={t("app.sales.walkInOrChoose")} />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="link" className="mt-2 h-auto p-0 text-primary" asChild>
          <Link to="/app/customers/new">{t("app.sales.addCustomerLink")}</Link>
        </Button>
      </FormSection>

      {!productId && (
        <FormSection title={t("app.sales.whatSold")} hint={t("app.record.notePlaceholder")}>
          <Input
            className="min-h-12 rounded-xl"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("app.sales.whatSoldPlaceholder")}
          />
        </FormSection>
      )}

      <Button
        type="button"
        className="min-h-12 w-full rounded-xl text-base font-bold shadow-md"
        disabled={submitting}
        onClick={() => void submit()}
      >
        {t("app.sales.saveSale")}
      </Button>
    </div>
  );
}
