import { describe, expect, it } from "vitest";

import { inventoryValue, isLowStock, parseQuantity } from "./stock-math";

describe("stock-math", () => {
  it("detects low stock", () => {
    expect(isLowStock(3, 5)).toBe(true);
    expect(isLowStock(10, 5)).toBe(false);
  });

  it("computes inventory value", () => {
    expect(inventoryValue(10, 100)).toBe(1000);
    expect(inventoryValue(10, null)).toBe(0);
  });

  it("parses quantity strings", () => {
    expect(parseQuantity("12")).toBe(12);
    expect(parseQuantity("2.5")).toBe(2.5);
    expect(parseQuantity("0")).toBe(null);
    expect(parseQuantity("abc")).toBe(null);
  });
});
