export const TRANSACTION_TYPES = [
  "sale",
  "expense",
  "purchase",
  "customer_payment",
  "supplier_payment",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHOD_IDS = [
  "cash",
  "transfer",
  "pos",
  "credit",
  "mobile_money",
  "other",
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];

export const TRANSACTION_TYPE_LABEL_KEYS: Record<TransactionType, string> = {
  sale: "app.record.types.sale",
  expense: "app.record.types.expense",
  purchase: "app.record.types.purchase",
  customer_payment: "app.record.types.customerPayment",
  supplier_payment: "app.record.types.supplierPayment",
};

export const PAYMENT_METHOD_LABEL_KEYS: Record<PaymentMethodId, string> = {
  cash: "onboarding.payments.cash",
  transfer: "onboarding.payments.transfer",
  pos: "onboarding.payments.pos",
  credit: "onboarding.payments.credit",
  mobile_money: "onboarding.payments.mobileMoney",
  other: "app.record.paymentOther",
};
