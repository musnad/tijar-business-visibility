import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearTranslationCache, translationCacheSize } from "./cache";
import { nkenneTranslate, NkenneError } from "./client";
import { checkLanguagePair, nkenneLanguageForLocale } from "./languages";
import { clearRateLimits } from "./rate-limit";
import { translateText } from "./service";

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  return vi.fn(async () => ({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
  })) as unknown as typeof fetch;
}

const okFetch = () => mockFetch({ jsonBody: { translatedText: "Mo n sise" } });

beforeEach(() => {
  clearTranslationCache();
  clearRateLimits();
});

describe("language rules (official docs)", () => {
  it("supports documented pairs via English", () => {
    expect(checkLanguagePair("English", "Yoruba").ok).toBe(true);
    expect(checkLanguagePair("Yoruba", "English").ok).toBe(true);
    expect(checkLanguagePair("English", "Swahili").ok).toBe(true);
    expect(checkLanguagePair("English", "Nigerian Pidgin").ok).toBe(true);
  });
  it("rejects Hausa, same-language and direct non-English pairs", () => {
    expect(checkLanguagePair("English", "Hausa")).toMatchObject({ ok: false, code: "UNSUPPORTED_LANGUAGE" });
    expect(checkLanguagePair("English", "English")).toMatchObject({ ok: false, code: "SAME_LANGUAGE" });
    expect(checkLanguagePair("Yoruba", "Swahili")).toMatchObject({ ok: false, code: "UNSUPPORTED_PAIR" });
  });
  it("maps Tijar locales, Hausa/Igbo unsupported by API", () => {
    expect(nkenneLanguageForLocale("yo")).toBe("Yoruba");
    expect(nkenneLanguageForLocale("sw")).toBe("Swahili");
    expect(nkenneLanguageForLocale("ha")).toBeNull();
    expect(nkenneLanguageForLocale("ig")).toBeNull();
  });
});

describe("client (mocked provider)", () => {
  it("translates both directions and sends documented shape", async () => {
    const fetchImpl = okFetch();
    const out = await nkenneTranslate(
      { apiKey: "test-key", fetchImpl, sleep: async () => {} },
      { text: "I am working", fromLanguage: "English", toLanguage: "Yoruba" },
    );
    expect(out).toBe("Mo n sise");
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/translate/with-api-key");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      text: "I am working",
      fromLanguage: "English",
      toLanguage: "Yoruba",
    });
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "test-key" });
  });

  it("fails safely without credentials", async () => {
    await expect(
      nkenneTranslate({ fetchImpl: okFetch() }, { text: "hi", fromLanguage: "English", toLanguage: "Yoruba" }),
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("maps 401/429/timeout", async () => {
    await expect(
      nkenneTranslate({ apiKey: "k", fetchImpl: mockFetch({ ok: false, status: 401 }), sleep: async () => {} }, { text: "hi", fromLanguage: "English", toLanguage: "Yoruba" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(
      nkenneTranslate({ apiKey: "k", fetchImpl: mockFetch({ ok: false, status: 429 }), sleep: async () => {} }, { text: "hi", fromLanguage: "English", toLanguage: "Yoruba" }),
    ).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    const abortFetch = vi.fn(async () => {
      const e = new Error("aborted");
      e.name = "AbortError";
      throw e;
    }) as unknown as typeof fetch;
    await expect(
      nkenneTranslate({ apiKey: "k", fetchImpl: abortFetch, sleep: async () => {}, maxRetries: 0 }, { text: "hi", fromLanguage: "English", toLanguage: "Yoruba" }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("retries once on provider 500 then succeeds", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 500, json: async () => ({}) } as Response;
      return { ok: true, status: 200, json: async () => ({ translatedText: "done" }) } as Response;
    }) as unknown as typeof fetch;
    const out = await nkenneTranslate(
      { apiKey: "k", fetchImpl, sleep: async () => {} },
      { text: "hi", fromLanguage: "English", toLanguage: "Yoruba" },
    );
    expect(out).toBe("done");
    expect(calls).toBe(2);
  });
});

describe("service: validation, cache, rate limit, originals preserved", () => {
  it("validates input and preserves original text", async () => {
    const bad = await translateText({ text: "  ", fromLanguage: "English", toLanguage: "Yoruba" });
    expect(bad.ok).toBe(false);
    const input = { text: "Fresh rice", fromLanguage: "English", toLanguage: "Yoruba" };
    const res = await translateText(input, { clientConfig: { apiKey: "k", fetchImpl: okFetch(), sleep: async () => {} } });
    expect(res).toMatchObject({ ok: true, translatedText: "Mo n sise", cached: false });
    expect(input.text).toBe("Fresh rice");
  });

  it("serves second identical request from cache (no extra API call)", async () => {
    const fetchImpl = okFetch();
    const cfg = { clientConfig: { apiKey: "k", fetchImpl, sleep: async () => {} } };
    await translateText({ text: "Rice", fromLanguage: "English", toLanguage: "Swahili" }, cfg);
    const second = await translateText({ text: "Rice", fromLanguage: "English", toLanguage: "Swahili" }, cfg);
    expect(second).toMatchObject({ ok: true, cached: true });
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect(translationCacheSize()).toBe(1);
  });

  it("rate limits repeated callers", async () => {
    const cfg = { clientConfig: { apiKey: "k", fetchImpl: okFetch(), sleep: async () => {} }, rateLimitKey: "user:1", rateLimit: 2 };
    await translateText({ text: "one", fromLanguage: "English", toLanguage: "Yoruba" }, cfg);
    await translateText({ text: "two", fromLanguage: "English", toLanguage: "Yoruba" }, cfg);
    const third = await translateText({ text: "three", fromLanguage: "English", toLanguage: "Yoruba" }, cfg);
    expect(third).toMatchObject({ ok: false, code: "RATE_LIMITED", status: 429 });
  });

  it("pivots non-English pairs via English using documented pairs only", async () => {
    const seen: string[] = [];
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}") as { fromLanguage: string; toLanguage: string };
      seen.push(`${body.fromLanguage}->${body.toLanguage}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({ translatedText: body.toLanguage === "English" ? "Rice" : "Mchele" }),
      } as Response;
    }) as unknown as typeof fetch;
    const res = await translateText(
      { text: "Arroz", fromLanguage: "Yoruba", toLanguage: "Swahili" },
      { clientConfig: { apiKey: "k", fetchImpl, sleep: async () => {} } },
    );
    expect(res).toMatchObject({ ok: true, translatedText: "Mchele" });
    expect(seen).toEqual(["Yoruba->English", "English->Swahili"]);
  });

  it("reports missing credentials as 503, not a fake translation", async () => {
    const res = await translateText(
      { text: "Rice", fromLanguage: "English", toLanguage: "Yoruba" },
      { clientConfig: { fetchImpl: okFetch() } },
    );
    expect(res).toMatchObject({ ok: false, code: "NOT_CONFIGURED", status: 503 });
  });
});

describe("NkenneError shape", () => {
  it("carries stable codes", () => {
    const e = new NkenneError("TIMEOUT", "x", 504);
    expect(e.code).toBe("TIMEOUT");
    expect(e.status).toBe(504);
  });
});
