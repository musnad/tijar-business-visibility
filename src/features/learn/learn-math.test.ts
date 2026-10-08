import { describe, expect, it } from "vitest";

import { levelFromXp, xpProgressInLevel } from "@/features/learn/learn-math";

describe("learn-math", () => {
  it("computes level from xp", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
  });

  it("computes progress within level", () => {
    expect(xpProgressInLevel(25)).toEqual({ current: 25, max: 50 });
    expect(xpProgressInLevel(50)).toEqual({ current: 0, max: 50 });
  });
});
