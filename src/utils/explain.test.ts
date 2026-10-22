import { describe, expect, it } from "vitest";

import { buildExplanation, parseExplainRequest } from "./explain";

const figures = {
  sales30: 500000,
  expenses30: 320000,
  profit30: 180000,
  salesToday: 25000,
  expensesToday: 5000,
  customerCreditTotal: 45000,
  healthScore: 72,
  healthBand: "stable",
};

describe("parseExplainRequest", () => {
  it("detects metrics in English and local keywords", () => {
    expect(parseExplainRequest("Explain my profit")).toBe("profit");
    expect(parseExplainRequest("How much did I sell today?")).toBe("today");
    expect(parseExplainRequest("What is my business health?")).toBe("health");
    expect(parseExplainRequest("Menene riba?")).toBe("profit");
    expect(parseExplainRequest("Record sale 5000 rice")).toBeNull();
  });
});

describe("buildExplanation", () => {
  it("uses only the given figures", () => {
    const profit = buildExplanation("profit", figures);
    expect(profit).toContain("₦180,000");
    expect(profit).toContain("₦500,000");
    expect(profit).toContain("made money");
  });
  it("handles loss and missing data honestly", () => {
    expect(buildExplanation("profit", { ...figures, profit30: -1000 })).toContain("lost money");
    expect(buildExplanation("health", { ...figures, healthScore: null })).toContain("not ready yet");
    expect(buildExplanation("credit", { ...figures, customerCreditTotal: null })).toContain("do not have");
  });
  it("explains today", () => {
    expect(buildExplanation("today", figures)).toContain("₦25,000");
  });
});
