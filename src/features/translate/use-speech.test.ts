import { describe, expect, it } from "vitest";

import { mapRecognitionError, speechLocaleCandidates } from "./use-speech";

describe("speechLocaleCandidates", () => {
  it("falls back from regional to base to English", () => {
    expect(speechLocaleCandidates("Hausa")).toEqual(["ha-NG", "ha", "en-NG", "en-US"]);
    expect(speechLocaleCandidates("Swahili")[0]).toBe("sw-KE");
    expect(speechLocaleCandidates("English")).toEqual(["en-NG", "en", "en-US"]);
  });
});

describe("mapRecognitionError", () => {
  it("gives specific, actionable messages", () => {
    expect(mapRecognitionError("not-allowed", true)).toContain("Microphone is blocked");
    expect(mapRecognitionError("no-speech", true)).toContain("did not hear");
    expect(mapRecognitionError("network", true)).toContain("internet");
    expect(mapRecognitionError("language-not-supported", true)).toContain("does not support");
    expect(mapRecognitionError("audio-capture", true)).toContain("No microphone");
  });

  it("explains the HTTPS requirement on insecure pages", () => {
    expect(mapRecognitionError("not-allowed", false)).toContain("https://");
  });
});
