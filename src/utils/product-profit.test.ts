import { describe, expect, it } from "vitest";

import { saleLineTotals, unitCost } from "./product-profit";

describe("product-profit", () => {
  it("computes line profit", () => {
    const r = saleLineTotals(1000, 700, 2);
    expect(r.revenue).toBe(2000);
    expect(r.cost).toBe(1400);
    expect(r.profit).toBe(600);
  });

  it("uses cost from product", () => {
    expect(unitCost({ kind: "service", cost_price: 500 })).toBe(500);
    expect(unitCost({ kind: "goods", cost_price: null })).toBe(0);
  });
});
