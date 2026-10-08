import { describe, expect, it } from "vitest";

import {
  buildRecommendationDrafts,
  computeBusinessHealth,
} from "./compute-business-health";

const base: Parameters<typeof computeBusinessHealth>[0] = {
  periodDays: 30,
  sales: 200_000,
  expenses: 120_000,
  profit: 80_000,
  customerCreditTotal: 20_000,
  supplierCreditTotal: 0,
  transactionsInPeriod: 24,
  daysSinceLastTransaction: 1,
};

describe("computeBusinessHealth", () => {
  it("scores healthy businesses strongly", () => {
    const result = computeBusinessHealth(base);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.band).toBe("strong");
  });

  it("flags risk when credit dominates and profit is negative", () => {
    const result = computeBusinessHealth({
      ...base,
      sales: 50_000,
      expenses: 70_000,
      profit: -20_000,
      customerCreditTotal: 40_000,
      transactionsInPeriod: 2,
      daysSinceLastTransaction: 10,
    });
    expect(result.score).toBeLessThan(50);
    expect(["watch", "risk"]).toContain(result.band);
  });
});

describe("buildRecommendationDrafts", () => {
  it("suggests collecting credit when customers owe", () => {
    const drafts = buildRecommendationDrafts({
      ...base,
      customerCreditTotal: 50_000,
    });
    expect(drafts.some((d) => d.code === "collect_customer_credit")).toBe(true);
  });

  it("suggests recording when activity is stale", () => {
    const drafts = buildRecommendationDrafts({
      ...base,
      transactionsInPeriod: 0,
      daysSinceLastTransaction: 14,
    });
    expect(drafts.some((d) => d.code === "record_more_often")).toBe(true);
  });
});
