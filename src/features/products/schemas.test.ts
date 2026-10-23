import { describe, expect, it } from "vitest";

import { normalizeMoneyRaw, productFormSchema } from "./schemas";

describe("normalizeMoneyRaw", () => {
  it("strips naira, commas, spaces and k", () => {
    expect(normalizeMoneyRaw("₦15,000")).toBe("15000");
    expect(normalizeMoneyRaw("12 000")).toBe("12000");
    expect(normalizeMoneyRaw("15k")).toBe("15000");
    expect(normalizeMoneyRaw("NGN 2500")).toBe("2500");
    expect(normalizeMoneyRaw("")).toBeUndefined();
  });
});

describe("productFormSchema", () => {
  it("accepts name-only product", () => {
    const r = productFormSchema.safeParse({ name: "Rice", kind: "goods", unit: "bag" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe("Rice");
  });

  it("accepts common Nigerian money formats", () => {
    const r = productFormSchema.safeParse({
      name: "Beans",
      kind: "goods",
      unit: "bag",
      salePrice: "₦45,000",
      costPrice: "38 000",
      initialStock: "8",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.salePrice).toBe(45000);
      expect(r.data.costPrice).toBe(38000);
      expect(r.data.initialStock).toBe(8);
    }
  });

  it("accepts 15k style prices", () => {
    const r = productFormSchema.safeParse({
      name: "Oil",
      kind: "goods",
      unit: "litre",
      salePrice: "15k",
      costPrice: "12k",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.salePrice).toBe(15000);
      expect(r.data.costPrice).toBe(12000);
    }
  });

  it("rejects empty name", () => {
    expect(productFormSchema.safeParse({ name: "  ", kind: "goods", unit: "piece" }).success).toBe(
      false,
    );
  });
});
