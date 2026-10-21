import { z } from "zod";

import { getCachedTranslation, setCachedTranslation, translationCacheKey } from "./cache";
import { nkenneTranslate, NkenneError, readNkenneConfig, type NkenneClientConfig } from "./client";
import { checkLanguagePair } from "./languages";
import { checkRateLimit } from "./rate-limit";

export const translateRequestSchema = z.object({
  text: z.string().trim().min(1, "Text is required.").max(1000, "Text is too long (max 1000 characters)."),
  fromLanguage: z.string().trim().min(1).max(40),
  toLanguage: z.string().trim().min(1).max(40),
});

export type TranslateResult =
  | { ok: true; translatedText: string; cached: boolean; fromLanguage: string; toLanguage: string }
  | { ok: false; status: number; code: string; message: string };

export type TranslateDeps = {
  clientConfig?: NkenneClientConfig;
  rateLimitKey?: string;
  rateLimit?: number;
};

/**
 * Orchestrates validation -> language-pair rules -> cache -> rate limit ->
 * provider. Original text is never mutated or logged.
 */
export async function translateText(
  rawInput: unknown,
  deps: TranslateDeps = {},
): Promise<TranslateResult> {
  const parsed = translateRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION",
      message: parsed.error.errors[0]?.message ?? "Invalid translation request.",
    };
  }
  const { text, fromLanguage, toLanguage } = parsed.data;

  const pair = checkLanguagePair(fromLanguage, toLanguage);
  if (!pair.ok) {
    return { ok: false, status: 400, code: pair.code, message: pair.message };
  }

  const cacheKey = translationCacheKey(text, fromLanguage, toLanguage);
  const cached = getCachedTranslation(cacheKey);
  if (cached !== null) {
    return { ok: true, translatedText: cached, cached: true, fromLanguage, toLanguage };
  }

  if (deps.rateLimitKey) {
    const limit = checkRateLimit(deps.rateLimitKey, deps.rateLimit ?? 20);
    if (!limit.allowed) {
      return {
        ok: false,
        status: 429,
        code: "RATE_LIMITED",
        message: `Too many translation requests. Try again in ${limit.retryAfterSeconds}s.`,
      };
    }
  }

  const env = readNkenneConfig();
  const config: NkenneClientConfig = deps.clientConfig ?? {
    apiKey: env.apiKey ?? undefined,
    baseUrl: env.baseUrl,
  };

  try {
    const translatedText = await nkenneTranslate(config, { text, fromLanguage, toLanguage });
    setCachedTranslation(cacheKey, translatedText);
    return { ok: true, translatedText, cached: false, fromLanguage, toLanguage };
  } catch (err) {
    if (err instanceof NkenneError) {
      return { ok: false, status: err.status, code: err.code, message: err.message };
    }
    return { ok: false, status: 502, code: "PROVIDER_ERROR", message: "Translation failed. Please try again." };
  }
}
