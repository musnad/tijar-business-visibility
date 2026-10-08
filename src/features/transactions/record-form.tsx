"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectOption } from "@/features/onboarding/multi-select";
import {
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_LABEL_KEYS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABEL_KEYS,
  type TransactionType,
} from "@/features/transactions/constants";
import { recordTransactionSchema } from "@/features/transactions/schemas";
import { useTranslation } from "@/lib/i18n/context";
import { listCustomers } from "@/services/customer-service";
import { listSuppliers } from "@/services/supplier-service";
import { createTransaction } from "@/services/transaction-service";
import type { Customer, Supplier } from "@/types/database";

export function RecordForm({
  businessId,
  profileId,
  initialType,
  onSaved,
}: {
  businessId: string;
  profileId: string;
  initialType?: TransactionType;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const [type, setType] = useState<TransactionType | null>(initialType ?? null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);

  useEffect(() => {
    void listCustomers(businessId).then(({ data }) => setCustomers(data));
    void listSuppliers(businessId).then(({ data }) => setSuppliers(data));
  }, [businessId]);

  const needsCustomer =
    type === "customer_payment" || (type === "sale" && paymentMethod === "credit");
  const needsSupplier =
    type === "supplier_payment" || (type === "purchase" && paymentMethod === "credit");
  const needsPayment = type === "sale" || type === "expense" || type === "purchase";

  async function submit() {
    if (!type) return;
    const parsed = recordTransactionSchema.safeParse({
      type,
      amount,
      description: description || undefined,
      paymentMethod: needsPayment ? paymentMethod || undefined : undefined,
      customerId: customerId || undefined,
      supplierId: supplierId || undefined,
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
    toast.success(t("app.record.saved"));
    setAmount("");
    setDescription("");
    setPaymentMethod("");
    setCustomerId("");
    setSupplierId("");
    onSaved?.();
  }

  return (
    <div className="space-y-6">
      {!initialType && (
        <div>
          <p className="text-sm font-medium">{t("app.record.pickType")}</p>
          <div className="mt-3 grid gap-2">
            {TRANSACTION_TYPES.map((id) => (
              <MultiSelectOption
                key={id}
                label={t(TRANSACTION_TYPE_LABEL_KEYS[id])}
                selected={type === id}
                onToggle={() => setType(id)}
              />
            ))}
          </div>
        </div>
      )}

      {type && (
        <>
          <div>
            <Label>{t("app.record.amount")}</Label>
            <Input
              className="mt-2 min-h-12 text-lg"
              inputMode="decimal"
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {needsPayment && (
            <div>
              <Label>{t("app.record.paymentMethod")}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-2 min-h-12">
                  <SelectValue placeholder={t("app.record.paymentMethod")} />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {t(PAYMENT_METHOD_LABEL_KEYS[id])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsCustomer && (
            <div>
              <Label>{t("app.record.customer")}</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="mt-2 min-h-12">
                  <SelectValue placeholder={t("app.record.chooseCustomer")} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customers.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{t("app.record.addCustomerFirst")}</p>
              )}
            </div>
          )}

          {needsSupplier && (
            <div>
              <Label>{t("app.record.supplier")}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="mt-2 min-h-12">
                  <SelectValue placeholder={t("app.record.chooseSupplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suppliers.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{t("app.record.addSupplierFirst")}</p>
              )}
            </div>
          )}

          <div>
            <Label>{t("app.record.note")}</Label>
            <Input
              className="mt-2 min-h-12"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("app.record.notePlaceholder")}
            />
          </div>

          <Button type="button" className="min-h-12 w-full" disabled={submitting} onClick={() => void submit()}>
            {t("app.record.save")}
          </Button>
        </>
      )}
    </div>
  );
}
