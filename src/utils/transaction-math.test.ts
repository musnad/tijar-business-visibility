import { describe, expect, it } from "vitest";

import { percentChange, sumSalesAndExpenses } from "./transaction-math";

describe("percentChange", () => {
  it("returns null when both periods are zero", () => {
    expect(percentChange(0, 0)).toBeNull();
  });

  it("returns negative change when sales drop", () => {
    expect(percentChange(80, 100)).toBe(-20);
  });

  it("returns positive change when sales grow", () => {
    expect(percentChange(150, 100)).toBe(50);
  });
});

describe("sumSalesAndExpenses", () => {
  it("treats sales and customer payments as money in", () => {
    const { sales, profit } = sumSalesAndExpenses([
      { type: "sale", amount: 1000 },
      { type: "customer_payment", amount: 500 },
      { type: "expense", amount: 200 },
    ]);
    expect(sales).toBe(1500);
    expect(profit).toBe(1300);
  });
});
