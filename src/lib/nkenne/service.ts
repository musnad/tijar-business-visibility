import { z } from "zod";

import { getCachedTranslation, setCachedTranslation, translationCacheKey } from "./cache";
import { nkenneTranslate, NkenneError, readNkenneConfig, type NkenneClientConfig } from "./client";
import { checkLanguagePair, isNkenneLanguage, resolveTranslationPath } from "./languages";
import { checkRateLimit } from "./rate-limit";

async function translateOneStep(
  text: string,
  from: string,
  to: string,
  config: NkenneClientConfig,
): Promise<string> {
  const key = translationCacheKey(text, from, to);
  const cached = getCachedTranslation(key);
  if (cached !== null) return cached;
  const translated = await nkenneTranslate(config, { text, fromLanguage: from, toLanguage: to });
  setCachedTranslation(key, translated);
  return translated;
}

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

export const translateBatchSchema = z.object({
  texts: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  fromLanguage: z.string().trim().min(1).max(40),
  toLanguage: z.string().trim().min(1).max(40),
});

/** Batch translation for UI strings / listing fields. Same rules as single. */
export async function translateBatch(
  rawInput: unknown,
  deps: TranslateDeps = {},
): Promise<{ ok: true; translations: string[] } | { ok: false; status: number; code: string; message: string }> {
  const parsed = translateBatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, status: 400, code: "VALIDATION", message: parsed.error.errors[0]?.message ?? "Invalid batch." };
  }
  const translations: string[] = [];
  for (const text of parsed.data.texts) {
    const result = await translateText(
      { text, fromLanguage: parsed.data.fromLanguage, toLanguage: parsed.data.toLanguage },
      deps,
    );
    if (!result.ok) return result;
    translations.push(result.translatedText);
  }
  return { ok: true, translations };
}

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

  if (!isNkenneLanguage(fromLanguage) || !isNkenneLanguage(toLanguage)) {
    const pair = checkLanguagePair(fromLanguage, toLanguage);
    if (!pair.ok) return { ok: false, status: 400, code: pair.code, message: pair.message };
  }
  if (fromLanguage === toLanguage) {
    return { ok: false, status: 400, code: "SAME_LANGUAGE", message: "Source and target language are the same." };
  }
  const path = resolveTranslationPath(fromLanguage, toLanguage);
  if (!path) {
    return { ok: false, status: 400, code: "UNSUPPORTED_PAIR", message: `Cannot translate ${fromLanguage} to ${toLanguage}.` };
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
    let current = text;
    for (let i = 0; i < path.length - 1; i++) {
      current = await translateOneStep(current, path[i]!, path[i + 1]!, config);
    }
    setCachedTranslation(cacheKey, current);
    return { ok: true, translatedText: current, cached: false, fromLanguage, toLanguage };
  } catch (err) {
    if (err instanceof NkenneError) {
      return { ok: false, status: err.status, code: err.code, message: err.message };
    }
    return { ok: false, status: 502, code: "PROVIDER_ERROR", message: "Translation failed. Please try again." };
  }
}
