import { describe, expect, it, vi } from "vitest";

import {
  openaiKeyFingerprint,
  openaiTranslate,
  readOpenAiConfig,
  OpenAiError,
} from "./client";

describe("readOpenAiConfig", () => {
  it("reads OPENAI_API_KEY from env map", () => {
    const cfg = readOpenAiConfig({ OPENAI_API_KEY: " sk-proj-testkey1234567890 " });
    expect(cfg.apiKey).toBe("sk-proj-testkey1234567890");
    expect(cfg.baseUrl).toContain("api.openai.com");
  });

  it("accepts CHATGPT_API_KEY alias", () => {
    const cfg = readOpenAiConfig({ CHATGPT_API_KEY: "sk-test-alias-key-abcdefgh" });
    expect(cfg.apiKey?.startsWith("sk-")).toBe(true);
  });

  it("fingerprints without exposing the secret", () => {
    const finger = openaiKeyFingerprint("sk-proj-ABCDEFGHijklmnop");
    expect(finger.present).toBe(true);
    expect(finger.formatOk).toBe(true);
    expect(finger.hint).toMatch(/^sk-p…/);
    expect(finger.hint).not.toContain("ABCDEFGH");
  });
});

describe("openaiTranslate (mocked)", () => {
  it("returns model text from chat completions", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Mo ra iresi" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const out = await openaiTranslate(
      { apiKey: "sk-test-key-1234567890", fetchImpl: fetchImpl as unknown as typeof fetch },
      { text: "I bought rice", fromLanguage: "English", toLanguage: "Yoruba" },
    );
    expect(out).toBe("Mo ra iresi");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer sk-test-key-1234567890",
    });
  });

  it("maps 401 to INVALID_CREDENTIALS", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("{}", { status: 401, headers: { "Content-Type": "application/json" } }),
    );
    await expect(
      openaiTranslate(
        { apiKey: "sk-bad", fetchImpl: fetchImpl as unknown as typeof fetch },
        { text: "Hi", fromLanguage: "English", toLanguage: "Hausa" },
      ),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" } satisfies Partial<OpenAiError>);
  });
});
