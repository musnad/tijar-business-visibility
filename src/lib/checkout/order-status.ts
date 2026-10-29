export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "confirmed",
  "processing",
  "shipped",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function canBuyerTransition(from: string, to: string): boolean {
  return from === "pending_payment" && to === "cancelled";
}

export function canSellerTransition(from: string, to: string): boolean {
  if (from === "pending_payment" && (to === "confirmed" || to === "cancelled")) return true;
  if (from === "confirmed" && to === "processing") return true;
  if (from === "processing" && (to === "shipped" || to === "ready_for_pickup" || to === "delivered")) return true;
  if ((from === "shipped" || from === "ready_for_pickup") && to === "delivered") return true;
  return false;
}

export function isClientPaidStatus(status: string): boolean {
  return status === "paid" || status === "refunded";
}

/** Client UI must never treat a local success flag as paid. */
export function orderPaidFromProvider(input: {
  orderStatus: string;
  paymentStatus: string | null;
  clientSaidPaid?: boolean;
}): boolean {
  if (input.clientSaidPaid) return false;
  return input.orderStatus === "paid" && input.paymentStatus === "success";
}
