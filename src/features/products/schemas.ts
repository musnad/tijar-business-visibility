import { z } from "zod";

const moneyOptional = z
  .string()
  .optional()
  .transform((raw) => (raw?.trim() ? raw.replace(/,/g, "").trim() : undefined))
  .refine((v) => v === undefined || /^\d+(\.\d{1,2})?$/.test(v), "Enter a valid amount")
  .transform((v) => (v === undefined ? undefined : Number.parseFloat(v)));

const qtySchema = z
  .string()
  .min(1, "Enter quantity")
  .transform((raw) => raw.replace(/,/g, "").trim())
  .refine((v) => /^\d+(\.\d{1,3})?$/.test(v), "Enter a valid quantity")
  .transform((v) => Number.parseFloat(v))
  .refine((n) => n > 0, "Quantity must be greater than zero");

const optionalQtyFromString = z
  .string()
  .optional()
  .transform((raw) => (raw?.trim() ? raw.replace(/,/g, "").trim() : undefined))
  .refine((v) => v === undefined || /^\d+(\.\d{1,3})?$/.test(v), "Enter a valid quantity")
  .transform((v) => (v === undefined ? undefined : Number.parseFloat(v)));

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  kind: z.enum(["goods", "service"]).default("goods"),
  unit: z.string().min(1).max(30).default("piece"),
  salePrice: moneyOptional,
  costPrice: moneyOptional,
  initialStock: optionalQtyFromString,
  lowStockThreshold: optionalQtyFromString,
  notes: z.string().max(500).optional(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const stockAdjustSchema = z.object({
  direction: z.enum(["in", "out"]),
  quantity: qtySchema,
  reason: z.enum(["purchase", "sale", "adjustment", "return"]),
  notes: z.string().max(500).optional(),
});

export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
