import { describe, expect, it } from "vitest";

import {
  mapRecognitionError,
  pickBestVoice,
  scoreVoiceForLocale,
  speechLocaleCandidates,
} from "./use-speech";

describe("speechLocaleCandidates", () => {
  it("falls back from regional to base to English", () => {
    expect(speechLocaleCandidates("Hausa")).toEqual(["ha-NG", "ha", "en-NG", "en-GB", "en-US", "en"]);
    expect(speechLocaleCandidates("Swahili")[0]).toBe("sw-KE");
    expect(speechLocaleCandidates("English")[0]).toBe("en-NG");
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

describe("pickBestVoice", () => {
  const voice = (lang: string, name: string, localService = true): SpeechSynthesisVoice =>
    ({ lang, name, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

  it("prefers exact locale match", () => {
    const voices = [voice("en-US", "US English"), voice("en-NG", "Nigerian English"), voice("yo-NG", "Yoruba")];
    expect(pickBestVoice("English", voices)?.lang).toBe("en-NG");
    expect(pickBestVoice("Yoruba", voices)?.lang).toBe("yo-NG");
  });

  it("falls back to same language family", () => {
    const voices = [voice("en-GB", "British"), voice("sw-TZ", "Swahili TZ")];
    expect(pickBestVoice("Swahili", voices)?.lang).toBe("sw-TZ");
    expect(scoreVoiceForLocale(voices[1]!, "sw-KE")).toBeGreaterThan(0);
  });

  it("returns null when no voices", () => {
    expect(pickBestVoice("English", [])).toBeNull();
  });
});
