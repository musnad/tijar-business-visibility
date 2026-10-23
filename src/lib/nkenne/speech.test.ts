import { beforeEach, describe, expect, it, vi } from "vitest";

import { NkenneError } from "./client";
import { clearRateLimits } from "./rate-limit";
import {
  nkenneSpeechTranslate,
  nkenneStt,
  nkenneTts,
  speechTranslatePair,
  SPEECH_LANGUAGE_SLUG,
} from "./speech";
import { speakTextServer, transcribeOrTranslateSpeech } from "./speech-service";

beforeEach(() => {
  clearRateLimits();
});

describe("speech language mapping", () => {
  it("maps display names to Speech Studio slugs", () => {
    expect(SPEECH_LANGUAGE_SLUG.English).toBe("english");
    expect(SPEECH_LANGUAGE_SLUG.Yoruba).toBe("yoruba");
    expect(SPEECH_LANGUAGE_SLUG.Swahili).toBe("swahili");
    expect(SPEECH_LANGUAGE_SLUG["Nigerian Pidgin"]).toBe("nigerian-pidgin");
  });

  it("exposes official speech-translate pairs (apidoc-st)", () => {
    expect(speechTranslatePair("Swahili", "English")).toBe("swahili-to-english");
    expect(speechTranslatePair("English", "Swahili")).toBe("english-to-swahili");
    expect(speechTranslatePair("Yoruba", "English")).toBe("yoruba-to-english");
    expect(speechTranslatePair("English", "Yoruba")).toBe("english-to-yoruba");
    expect(speechTranslatePair("Nigerian Pidgin", "English")).toBe("pidgin-to-english");
    expect(speechTranslatePair("English", "Nigerian Pidgin")).toBe("english-to-pidgin");
    // Direct non-English pairs are not in the Speech Translations API
    expect(speechTranslatePair("Yoruba", "Swahili")).toBeNull();
  });
});

describe("nkenneTts", () => {
  it("posts JSON to /api/tts/v1/{lang}/with-api-key and returns audio bytes", async () => {
    const bytes = new Uint8Array([82, 73, 70, 70]).buffer; // RIFF
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "audio/wav" },
      arrayBuffer: async () => bytes,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const out = await nkenneTts(
      { apiKey: "nk_test", fetchImpl, timeoutMs: 5_000 },
      { text: "Bawo ni", language: "Yoruba" },
    );
    expect(out.contentType).toBe("audio/wav");
    expect(out.bytes.byteLength).toBe(4);

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/tts/v1/yoruba/with-api-key");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "nk_test" });
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      text: "Bawo ni",
      speaking_rate: 1,
    });
  });

  it("requires API key", async () => {
    await expect(
      nkenneTts({ apiKey: "", fetchImpl: vi.fn() as unknown as typeof fetch }, { text: "hi", language: "English" }),
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });
});

describe("nkenneStt", () => {
  it("reads live `transcription` field", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "success", transcription: "báwo ni" }),
    })) as unknown as typeof fetch;

    const out = await nkenneStt(
      { apiKey: "nk_test", fetchImpl, timeoutMs: 5_000 },
      { audio: new Blob([new Uint8Array(64)], { type: "audio/wav" }), language: "Yoruba" },
    );
    expect(out.text).toBe("báwo ni");
    const [url] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/stt/v1/yoruba/with-api-key");
  });

  it("tries pidgin then nigerian-pidgin for Nigerian Pidgin", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: "how far" }),
      }) as unknown as typeof fetch;

    const out = await nkenneStt(
      { apiKey: "nk_test", fetchImpl, timeoutMs: 5_000 },
      { audio: new Blob([new Uint8Array(64)], { type: "audio/wav" }), language: "Nigerian Pidgin" },
    );
    expect(out.text).toBe("how far");
    const calls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toContain("/api/stt/v1/pidgin/with-api-key");
    expect(calls[1][0]).toContain("/api/stt/v1/nigerian-pidgin/with-api-key");
  });
});

describe("nkenneSpeechTranslate", () => {
  it("posts to /api/st/v1/{pair}/with-api-key", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ translated_text: "hello friend" }),
    })) as unknown as typeof fetch;

    const out = await nkenneSpeechTranslate(
      { apiKey: "nk_test", fetchImpl, timeoutMs: 5_000 },
      {
        audio: new Blob([new Uint8Array(64)], { type: "audio/wav" }),
        fromLanguage: "Swahili",
        toLanguage: "English",
      },
    );
    expect(out.translatedText).toBe("hello friend");
    expect(out.pair).toBe("swahili-to-english");
  });

  it("rejects unsupported pairs", async () => {
    await expect(
      nkenneSpeechTranslate(
        { apiKey: "nk_test", fetchImpl: vi.fn() as unknown as typeof fetch },
        {
          audio: new Blob([new Uint8Array(8)]),
          fromLanguage: "Yoruba",
          toLanguage: "Swahili",
        },
      ),
    ).rejects.toBeInstanceOf(NkenneError);
  });
});

describe("speech-service orchestration", () => {
  it("speakTextServer returns audio on success", async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => bytes,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const result = await speakTextServer(
      { text: "Hello", language: "English" },
      { clientConfig: { apiKey: "nk_test", fetchImpl, timeoutMs: 5_000 } },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.audio.contentType).toBe("audio/mpeg");
  });

  it("falls back to STT + text when speech-translate upstream fails", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes("/st/")) {
        return { ok: false, status: 503, json: async () => ({ message: "no healthy upstream" }) };
      }
      if (String(url).includes("/stt/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ transcription: "good morning" }),
        };
      }
      if (String(url).includes("/translate/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ translated_text: "ẹ káàárọ̀" }),
        };
      }
      return { ok: false, status: 500, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const result = await transcribeOrTranslateSpeech(
      {
        audio: new Blob([new Uint8Array(512)], { type: "audio/webm" }),
        language: "English",
        toLanguage: "Yoruba",
      },
      { clientConfig: { apiKey: "nk_test", fetchImpl, timeoutMs: 5_000 } },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transcript).toBe("good morning");
      expect(result.translatedText).toBe("ẹ káàárọ̀");
      expect(result.mode).toBe("stt");
    }
  });
});
