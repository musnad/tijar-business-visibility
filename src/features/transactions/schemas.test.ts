import { describe, expect, it } from "vitest";

import { recordTransactionSchema } from "./schemas";

describe("recordTransactionSchema", () => {
  it("requires credit sale to have a customer", () => {
    const result = recordTransactionSchema.safeParse({
      type: "sale",
      amount: "1000",
      paymentMethod: "credit",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a cash expense with category as description", () => {
    const result = recordTransactionSchema.safeParse({
      type: "expense",
      amount: "500",
      paymentMethod: "cash",
      description: "Transport",
    });
    expect(result.success).toBe(true);
  });

  it("requires payment method on expense", () => {
    const result = recordTransactionSchema.safeParse({
      type: "expense",
      amount: "500",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a cash sale", () => {
    const result = recordTransactionSchema.safeParse({
      type: "sale",
      amount: "2,500.50",
      paymentMethod: "cash",
      description: "Fabric",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(2500.5);
    }
  });

  it("accepts customer payment with customer id", () => {
    const result = recordTransactionSchema.safeParse({
      type: "customer_payment",
      amount: "500",
      paymentMethod: "cash",
      customerId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});
