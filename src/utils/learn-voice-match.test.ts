import { describe, expect, it } from "vitest";

import { isSpokenSubmit, matchSpokenOption } from "./learn-voice-match";

describe("matchSpokenOption", () => {
  const opts = ["₦500", "₦1,500", "₦2,500"];

  it("matches letter answers", () => {
    expect(matchSpokenOption("B", opts)).toBe(1);
    expect(matchSpokenOption("option A", opts)).toBe(0);
    expect(matchSpokenOption("letter c", opts)).toBe(2);
  });

  it("matches ordinals", () => {
    expect(matchSpokenOption("the first one", opts)).toBe(0);
    expect(matchSpokenOption("second", opts)).toBe(1);
  });

  it("matches label text", () => {
    expect(matchSpokenOption("1500", ["Five hundred", "One thousand five hundred", "Two thousand"])).toBeNull();
    expect(matchSpokenOption("one thousand five hundred", ["Five hundred", "One thousand five hundred", "Two thousand"])).toBe(1);
  });
});

describe("isSpokenSubmit", () => {
  it("detects check phrases", () => {
    expect(isSpokenSubmit("check")).toBe(true);
    expect(isSpokenSubmit("I'm done")).toBe(true);
    expect(isSpokenSubmit("rice bag")).toBe(false);
  });
});
