import { describe, expect, it } from "vitest";

import {
  GOAL_KEYWORDS,
  matchSpokenOption,
  matchSpokenOptions,
  MODEL_KEYWORDS,
  parseYesNo,
  PAYMENT_KEYWORDS,
  PROMPTS,
} from "./voice-onboarding";

describe("parseYesNo across languages", () => {
  it("understands English, Hausa, Swahili, Yoruba", () => {
    expect(parseYesNo("yes")).toBe(true);
    expect(parseYesNo("Ee, ina so")).toBe(true);
    expect(parseYesNo("A'a")).toBe(false);
    expect(parseYesNo("Ndiyo")).toBe(true);
    expect(parseYesNo("Hapana")).toBe(false);
    expect(parseYesNo("Bẹẹni")).toBe(true);
    expect(parseYesNo("maybe later")).toBeNull();
  });
});

describe("spoken option matching", () => {
  it("matches by keyword and by number in local languages", () => {
    expect(matchSpokenOption("I sell food", MODEL_KEYWORDS)?.id).toBe("food");
    expect(matchSpokenOption("abinci", MODEL_KEYWORDS)?.id).toBe("food");
    expect(matchSpokenOption("chakula", MODEL_KEYWORDS)?.id).toBe("food");
    expect(matchSpokenOption("two", MODEL_KEYWORDS)?.id).toBe("service");
    expect(matchSpokenOption("biyu", MODEL_KEYWORDS)?.id).toBe("service");
  });

  it("matches multiple payments and detects done", () => {
    const r = matchSpokenOptions("cash and transfer, done", PAYMENT_KEYWORDS);
    expect(r.matched.map((m) => m.id)).toEqual(["cash", "transfer"]);
    expect(r.done).toBe(true);
    const goals = matchSpokenOptions("increase sales and more profit", GOAL_KEYWORDS);
    expect(goals.matched.length).toBeGreaterThanOrEqual(1);
  });
});

describe("prompts", () => {
  it("has complete prompts for all four languages", () => {
    for (const lang of ["English", "Hausa", "Swahili", "Yoruba"] as const) {
      expect(PROMPTS[lang].askName.length).toBeGreaterThan(5);
      expect(PROMPTS[lang].review.length).toBeGreaterThan(5);
      expect(PROMPTS[lang].saved).toContain("TIJAR");
    }
  });
});
