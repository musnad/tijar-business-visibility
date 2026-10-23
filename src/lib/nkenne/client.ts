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
  /** Provider HTTP status when known (never returned to browsers). */
  providerStatus?: number;
  constructor(code: NkenneErrorCode, message: string, status = 502, providerStatus?: number) {
    super(message);
    this.code = code;
    this.status = status;
    if (providerStatus !== undefined) this.providerStatus = providerStatus;
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

/** Env names accepted (first non-empty wins). Never use a VITE_ prefix for secrets. */
const API_KEY_ENV_NAMES = ["NKENNEAI_API_KEY", "NKENNE_API_KEY"] as const;
const BASE_URL_ENV_NAMES = ["NKENNEAI_BASE_URL", "NKENNE_BASE_URL"] as const;

/** Strip accidental quotes/whitespace/zero-width chars from dashboard-pasted secrets. */
export function sanitizeSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  let v = value
    .trim()
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, "");
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  v = v.replace(/\s+/g, "");
  // Common paste mistake: "Bearer nk_…" stored as the whole env value
  if (/^bearer/i.test(v)) {
    v = v.replace(/^bearer/i, "").trim();
  }
  return v.length > 0 ? v : null;
}

function readDynamicEnv(names: readonly string[], override?: Record<string, string | undefined>): string | undefined {
  for (const name of names) {
    // Explicit override map (tests): only read from that map, never host env.
    if (override) {
      const v = override[name];
      if (typeof v === "string" && v.trim()) return v;
      continue;
    }
    const fromReader = readEnvString(name);
    if (fromReader) return fromReader;
    if (typeof process !== "undefined" && process.env) {
      const fromProcess = process.env[name];
      if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess;
    }
  }
  return undefined;
}

export function readNkenneConfig(env?: Record<string, string | undefined>): {
  apiKey: string | null;
  baseUrl: string;
} {
  const apiKey = sanitizeSecret(readDynamicEnv(API_KEY_ENV_NAMES, env));
  const baseUrl = (sanitizeSecret(readDynamicEnv(BASE_URL_ENV_NAMES, env)) || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );
  return { apiKey, baseUrl };
}

/** Safe fingerprint for health checks — never the full secret. */
export function nkenneKeyFingerprint(apiKey: string | null): {
  present: boolean;
  formatOk: boolean;
  length: number;
  hint: string | null;
} {
  if (!apiKey) return { present: false, formatOk: false, length: 0, hint: null };
  const formatOk = apiKey.startsWith("nk_") && apiKey.length >= 20 && apiKey.length <= 128;
  const hint =
    apiKey.length >= 8 ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}` : `${apiKey.slice(0, 2)}…`;
  return { present: true, formatOk, length: apiKey.length, hint };
}

function parseTranslatedText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj["translated_text"] === "string" && obj["translated_text"]) return obj["translated_text"];
  if (typeof obj["translatedText"] === "string" && obj["translatedText"]) return obj["translatedText"];
  return null;
}

async function attemptOnce(
  config: Required<Pick<NkenneClientConfig, "baseUrl" | "timeoutMs" | "fetchImpl">> & { apiKey: string },
  input: { text: string; fromLanguage: string; toLanguage: string },
  authHeader: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  let res: Response;
  try {
    res = await config.fetchImpl(`${config.baseUrl}/api/translate/with-api-key`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
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
    const data = await res.json().catch(() => null);
    const translated = parseTranslatedText(data);
    if (translated) return translated;
    throw new NkenneError("PROVIDER_ERROR", "Translation service returned an unexpected response.", 502);
  }

  if (res.status === 401) {
    throw new NkenneError(
      "INVALID_CREDENTIALS",
      "Translation key was rejected. Re-check NKENNEAI_API_KEY on the server, then redeploy.",
      502,
      res.status,
    );
  }
  if (res.status === 403) {
    throw new NkenneError(
      "PROVIDER_ERROR",
      "The translation service blocked this server. Try again later, or contact NKENNEAi support.",
      502,
      res.status,
    );
  }
  // NKENNEAi returns 402 when the API key has no tokens left.
  if (res.status === 402 || res.status === 429) {
    throw new NkenneError(
      "QUOTA_EXCEEDED",
      "Translation credits are finished. Top up tokens in your NKENNEAi dashboard, then try again.",
      429,
      res.status,
    );
  }
  if (res.status === 400 || res.status === 422) {
    throw new NkenneError("UNSUPPORTED_LANGUAGE", "That language or text could not be translated.", 400);
  }
  throw new NkenneError("PROVIDER_ERROR", "Translation service is unavailable. Please try again.", 502, res.status);
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

  // Official docs: raw API key in Authorization. Only fall back to Bearer on 401.
  const authStyles = [resolved.apiKey, `Bearer ${resolved.apiKey}`];

  let lastError: unknown;
  for (let styleIndex = 0; styleIndex < authStyles.length; styleIndex++) {
    const authHeader = authStyles[styleIndex]!;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await attemptOnce(resolved, input, authHeader);
      } catch (err) {
        lastError = err;
        if (err instanceof NkenneError && err.code === "QUOTA_EXCEEDED") {
          throw err; // Don't burn more tokens trying Bearer
        }
        if (err instanceof NkenneError && err.code === "INVALID_CREDENTIALS") {
          break; // try next auth style
        }
        const retryable =
          err instanceof NkenneError && (err.code === "NETWORK" || err.code === "PROVIDER_ERROR");
        if (!retryable || attempt === maxRetries) break;
        await sleep(300 * (attempt + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new NkenneError("PROVIDER_ERROR", "Translation failed.", 502);
}
