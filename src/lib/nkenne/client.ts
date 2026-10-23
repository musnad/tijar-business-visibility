/**
 * NKENNEAi HTTP client — official text-to-text endpoint only:
 *   POST https://developers-api.nkenne.ai/api/translate/with-api-key
 *   Header: Authorization: <API_KEY>   (raw key, per official examples)
 *   Body:   { text, fromLanguage, toLanguage }
 *   OK:     { translated_text } (live API) or { translatedText } (docs/legacy)
 *
 * Never log request/response text. Errors are mapped to stable codes so
 * routes can respond without leaking provider internals.
 *
 * Env access MUST be dynamic (`process.env[name]` / readEnvString) so Vite
 * does not inline secrets to `undefined` at build time on Vercel.
 */

import { readEnvString } from "@/lib/supabase/runtime-env";

export type NkenneErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "UNSUPPORTED_LANGUAGE"
  | "BAD_REQUEST"
  | "TIMEOUT"
  | "NETWORK"
  | "PROVIDER_ERROR";

export class NkenneError extends Error {
  code: NkenneErrorCode;
  status: number;
  constructor(code: NkenneErrorCode, message: string, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type NkenneClientConfig = {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Injectable for tests; defaults to 1 retry on 5xx/network. */
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_BASE_URL = "https://developers-api.nkenne.ai";

/** Strip accidental quotes/whitespace/zero-width chars from dashboard-pasted secrets. */
export function sanitizeSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  let v = value.trim()
    // BOM / zero-width / bidi marks that sneak in from copy-paste
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, "");
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  // API keys never contain whitespace — remove any that got pasted mid-string
  v = v.replace(/\s+/g, "");
  return v.length > 0 ? v : null;
}

export function readNkenneConfig(env?: Record<string, string | undefined>): {
  apiKey: string | null;
  baseUrl: string;
} {
  // Prefer explicit env (tests); otherwise dynamic host env — never static
  // process.env.NKENNEAI_API_KEY (Vite can replace that with undefined at build).
  const rawKey = env
    ? env["NKENNEAI_API_KEY"]
    : (readEnvString("NKENNEAI_API_KEY") ??
      (typeof process !== "undefined" ? process.env["NKENNEAI_API_KEY"] : undefined));
  const rawBase = env
    ? env["NKENNEAI_BASE_URL"]
    : (readEnvString("NKENNEAI_BASE_URL") ??
      (typeof process !== "undefined" ? process.env["NKENNEAI_BASE_URL"] : undefined));
  const apiKey = sanitizeSecret(rawKey);
  const baseUrl = (sanitizeSecret(rawBase) || DEFAULT_BASE_URL).replace(/\/$/, "");
  return { apiKey, baseUrl };
}

async function attemptOnce(
  config: Required<Pick<NkenneClientConfig, "baseUrl" | "timeoutMs" | "fetchImpl">> & { apiKey: string },
  input: { text: string; fromLanguage: string; toLanguage: string },
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  let res: Response;
  try {
    res = await config.fetchImpl(`${config.baseUrl}/api/translate/with-api-key`, {
      method: "POST",
      headers: {
        Authorization: config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new NkenneError("TIMEOUT", "Translation took too long. Please try again.", 504);
    }
    throw new NkenneError("NETWORK", "Could not reach the translation service.", 502);
  } finally {
    clearTimeout(timer);
  }

  if (res.ok) {
    const data = (await res.json().catch(() => null)) as {
      translatedText?: unknown;
      translated_text?: unknown;
    } | null;
    // Live NKENNEAi returns snake_case; docs/examples sometimes show camelCase.
    const translated =
      (typeof data?.translated_text === "string" && data.translated_text) ||
      (typeof data?.translatedText === "string" && data.translatedText) ||
      null;
    if (translated) return translated;
    throw new NkenneError("PROVIDER_ERROR", "Translation service returned an unexpected response.", 502);
  }

  if (res.status === 401 || res.status === 403) {
    // 401 = bad/missing key; 403 = key rejected or plan/IP restriction.
    // Same user-facing message — never echo provider body.
    throw new NkenneError(
      "INVALID_CREDENTIALS",
      "Translation is not configured correctly. Please contact support.",
      502,
    );
  }
  if (res.status === 429) {
    throw new NkenneError("QUOTA_EXCEEDED", "Translation limit reached for now. Please try again later.", 429);
  }
  if (res.status === 400 || res.status === 422) {
    throw new NkenneError("UNSUPPORTED_LANGUAGE", "That language or text could not be translated.", 400);
  }
  throw new NkenneError("PROVIDER_ERROR", "Translation service is unavailable. Please try again.", 502);
}

export async function nkenneTranslate(
  config: NkenneClientConfig,
  input: { text: string; fromLanguage: string; toLanguage: string },
): Promise<string> {
  if (!config.apiKey) {
    throw new NkenneError(
      "NOT_CONFIGURED",
      "Translation is not configured on this server (missing NKENNEAI_API_KEY).",
      503,
    );
  }
  const resolved = {
    apiKey: config.apiKey,
    baseUrl: (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, ""),
    timeoutMs: config.timeoutMs ?? 12_000,
    fetchImpl: config.fetchImpl ?? fetch,
  };
  const maxRetries = config.maxRetries ?? 1;
  const sleep = config.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await attemptOnce(resolved, input);
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof NkenneError && (err.code === "NETWORK" || err.code === "PROVIDER_ERROR");
      if (!retryable || attempt === maxRetries) break;
      await sleep(300 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new NkenneError("PROVIDER_ERROR", "Translation failed.", 502);
}
