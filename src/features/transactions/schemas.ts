import { z } from "zod";

import {
  PAYMENT_METHOD_IDS,
  TRANSACTION_TYPES,
  type PaymentMethodId,
  type TransactionType,
} from "./constants";

const amountSchema = z
  .string()
  .min(1, "Enter an amount")
  .transform((raw) => raw.replace(/,/g, "").trim())
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter a valid amount")
  .transform((v) => Number.parseFloat(v))
  .refine((n) => n > 0, "Amount must be greater than zero");

const optionalSaleQty = z
  .string()
  .optional()
  .transform((raw) => (raw?.trim() ? raw.replace(/,/g, "").trim() : undefined))
  .refine((v) => v === undefined || /^\d+(\.\d{1,3})?$/.test(v), "Enter a valid quantity")
  .transform((v) => (v === undefined ? undefined : Number.parseFloat(v)));

const baseFields = {
  amount: amountSchema,
  description: z.string().max(500).optional(),
  paymentMethod: z.enum(PAYMENT_METHOD_IDS).optional(),
  customerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  quantity: optionalSaleQty,
  occurredAt: z.string().min(10).max(40).optional(),
};

function withPartyRules<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const row = data as {
      type: TransactionType;
      paymentMethod?: PaymentMethodId;
      customerId?: string;
      supplierId?: string;
    };

    if (row.type === "customer_payment" && !row.customerId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a customer", path: ["customerId"] });
    }

    if (row.type === "customer_payment" && !row.paymentMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose how they paid",
        path: ["paymentMethod"],
      });
    }

    if (row.type === "supplier_payment" && !row.supplierId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a supplier", path: ["supplierId"] });
    }

    if (row.type === "sale" && row.paymentMethod === "credit" && !row.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Credit sales need a customer",
        path: ["customerId"],
      });
    }

    if (row.type === "purchase" && row.paymentMethod === "credit" && !row.supplierId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Credit purchases need a supplier",
        path: ["supplierId"],
      });
    }

    if (row.type === "sale" || row.type === "purchase" || row.type === "expense") {
      if (!row.paymentMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose how they paid",
          path: ["paymentMethod"],
        });
      }
    }
  });
}

export const recordTransactionSchema = withPartyRules(
  z.object({
    type: z.enum(TRANSACTION_TYPES),
    ...baseFields,
  }),
);

export type RecordTransactionInput = z.infer<typeof recordTransactionSchema>;

export const customerFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(120).optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export const supplierFormSchema = customerFormSchema;

export type CustomerFormInput = z.infer<typeof customerFormSchema>;
export type SupplierFormInput = z.infer<typeof supplierFormSchema>;
