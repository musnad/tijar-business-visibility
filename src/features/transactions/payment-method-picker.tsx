"use client";

import {
  Banknote,
  CreditCard,
  Smartphone,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_LABEL_KEYS,
  type PaymentMethodId,
} from "@/features/transactions/constants";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const paymentIcons: Record<PaymentMethodId, LucideIcon> = {
  cash: Banknote,
  transfer: Truck,
  pos: CreditCard,
  credit: Wallet,
  mobile_money: Smartphone,
  other: Wallet,
};

const paymentTone: Record<PaymentMethodId, string> = {
  cash: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  transfer: "bg-sky-100 text-sky-700 ring-sky-200",
  pos: "bg-violet-100 text-violet-700 ring-violet-200",
  credit: "bg-amber-100 text-amber-800 ring-amber-200",
  mobile_money: "bg-teal-100 text-teal-800 ring-teal-200",
  other: "bg-muted text-muted-foreground ring-border",
};

export function PaymentMethodPicker({
  value,
  onChange,
  excludeCredit,
}: {
  value: PaymentMethodId | "";
  onChange: (id: PaymentMethodId) => void;
  excludeCredit?: boolean;
}) {
  const { t } = useTranslation();
  const ids = PAYMENT_METHOD_IDS.filter((id) => id !== "other" && !(excludeCredit && id === "credit"));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ids.map((id) => {
        const Icon = paymentIcons[id];
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border border-transparent p-3 text-center transition-all",
              selected ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/40 hover:bg-muted/70",
            )}
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full ring-1",
                paymentTone[id],
              )}
            >
              <Icon className="size-4" strokeWidth={2.25} />
            </span>
            <span className="text-[10px] font-semibold leading-tight">
              {t(PAYMENT_METHOD_LABEL_KEYS[id])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
