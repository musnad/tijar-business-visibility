/**
 * NKENNEAi Speech Studio (Beta) — verified from public API docs + live probes
 * (developers-api.nkenne.ai, 2026-10-23):
 *
 *   TTS  POST /api/tts/v1/{language}/with-api-key  JSON → audio bytes
 *   STT  POST /api/stt/v1/{language}/with-api-key  multipart audio_file → JSON
 *   ST   POST /api/st/v1/{pair}/with-api-key       multipart audio_file → JSON
 *
 * Language URL slugs: english | yoruba | swahili | nigerian-pidgin
 * Speech-translate pairs (live): swahili↔english, yoruba→english, pidgin→english
 *
 * Never log audio or transcripts. API key stays server-only.
 */

import {
  NkenneError,
  readNkenneConfig,
  type NkenneClientConfig,
  type NkenneErrorCode,
} from "./client";
import { isNkenneLanguage, type NkenneLanguage } from "./languages";

const DEFAULT_BASE_URL = "https://developers-api.nkenne.ai";
const DEFAULT_TIMEOUT_MS = 45_000;
const USER_AGENT = "TIJAR/1.0 (+https://tijar-two.vercel.app)";

/** Display name → Speech Studio path slug. */
export const SPEECH_LANGUAGE_SLUG: Record<NkenneLanguage, string> = {
  English: "english",
  Yoruba: "yoruba",
  Swahili: "swahili",
  "Nigerian Pidgin": "nigerian-pidgin",
};

/** STT sometimes uses shorter "pidgin" — try these in order. */
export function sttLanguageCandidates(language: NkenneLanguage): string[] {
  if (language === "Nigerian Pidgin") return ["pidgin", "nigerian-pidgin"];
  return [SPEECH_LANGUAGE_SLUG[language]];
}

/**
 * Official Speech Translations pairs (nkenneai-apidoc-st.pdf).
 * Pair slug uses "pidgin" (not "nigerian-pidgin").
 */
export const SPEECH_TRANSLATE_PAIRS = [
  "swahili-to-english",
  "yoruba-to-english",
  "pidgin-to-english",
  "english-to-swahili",
  "english-to-yoruba",
  "english-to-pidgin",
] as const;

export type SpeechTranslatePair = (typeof SPEECH_TRANSLATE_PAIRS)[number];

function pairSlug(from: NkenneLanguage, to: NkenneLanguage): string {
  const a = from === "Nigerian Pidgin" ? "pidgin" : SPEECH_LANGUAGE_SLUG[from];
  const b = to === "Nigerian Pidgin" ? "pidgin" : SPEECH_LANGUAGE_SLUG[to];
  return `${a}-to-${b}`;
}

export function speechTranslatePair(
  from: string,
  to: string,
): SpeechTranslatePair | null {
  if (!isNkenneLanguage(from) || !isNkenneLanguage(to) || from === to) return null;
  const slug = pairSlug(from, to);
  return (SPEECH_TRANSLATE_PAIRS as readonly string[]).includes(slug)
    ? (slug as SpeechTranslatePair)
    : null;
}

function resolveConfig(config: NkenneClientConfig = {}): {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
} {
  const env = readNkenneConfig();
  // Explicit apiKey (including "") wins so tests can force NOT_CONFIGURED.
  const rawKey = config.apiKey !== undefined ? config.apiKey : env.apiKey;
  const apiKey = rawKey?.trim() ? rawKey : undefined;
  if (!apiKey) {
    throw new NkenneError(
      "NOT_CONFIGURED",
      "Speech is not configured on this server (missing NKENNEAI_API_KEY).",
      503,
    );
  }
  return {
    apiKey,
    baseUrl: (config.baseUrl || env.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, ""),
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    fetchImpl: config.fetchImpl ?? fetch,
  };
}

function mapHttpError(status: number, fallback: string): NkenneError {
  if (status === 401) {
    return new NkenneError(
      "INVALID_CREDENTIALS",
      "Speech key was rejected. Re-check NKENNEAI_API_KEY on the server.",
      502,
      status,
    );
  }
  if (status === 403) {
    return new NkenneError(
      "PROVIDER_ERROR",
      "The speech service blocked this server. Try again later.",
      502,
      status,
    );
  }
  if (status === 402 || status === 429) {
    return new NkenneError(
      "QUOTA_EXCEEDED",
      "Speech credits are finished. Top up tokens in your NKENNEAi dashboard.",
      429,
      status,
    );
  }
  if (status === 400 || status === 422) {
    return new NkenneError("BAD_REQUEST", fallback, 400, status);
  }
  if (status === 504) {
    return new NkenneError("TIMEOUT", "Speech took too long. Please try again.", 504, status);
  }
  return new NkenneError("PROVIDER_ERROR", fallback, 502, status);
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new NkenneError("TIMEOUT", "Speech took too long. Please try again.", 504);
    }
    throw new NkenneError("NETWORK", "Could not reach the speech service.", 502);
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(apiKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: apiKey,
    Accept: "application/json",
    "User-Agent": USER_AGENT,
    ...extra,
  };
}

export type TtsResult = {
  bytes: ArrayBuffer;
  contentType: string;
};

/** Synthesize speech. Returns raw audio (WAV or MP3 depending on language). */
export async function nkenneTts(
  config: NkenneClientConfig,
  input: { text: string; language: NkenneLanguage; voiceName?: string; speakingRate?: number },
): Promise<TtsResult> {
  const cleaned = input.text.replace(/\s+/g, " ").trim();
  if (!cleaned) throw new NkenneError("BAD_REQUEST", "Text is required for speech.", 400);

  const resolved = resolveConfig(config);
  const slug = SPEECH_LANGUAGE_SLUG[input.language];
  const body: Record<string, unknown> = {
    text: cleaned.slice(0, 1000),
    speaking_rate: input.speakingRate ?? 1,
  };
  if (input.voiceName) body.voice_name = input.voiceName;

  const res = await fetchWithTimeout(
    resolved.fetchImpl,
    `${resolved.baseUrl}/api/tts/v1/${slug}/with-api-key`,
    {
      method: "POST",
      headers: authHeaders(resolved.apiKey, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
    resolved.timeoutMs,
  );

  if (!res.ok) {
    throw mapHttpError(res.status, "Could not generate speech. Please try again.");
  }

  const contentType = res.headers.get("content-type") || "audio/wav";
  // Some errors return JSON with 200-ish wrappers — detect tiny JSON failures.
  if (contentType.includes("application/json")) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new NkenneError(
      "PROVIDER_ERROR",
      data?.message || "Speech synthesis failed.",
      502,
    );
  }

  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength) {
    throw new NkenneError("PROVIDER_ERROR", "Speech service returned empty audio.", 502);
  }
  return { bytes, contentType: contentType.split(";")[0]!.trim() || "audio/wav" };
}

function parseTranscript(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  // Live API uses `transcription`; docs sample uses `text`.
  for (const key of ["transcription", "text", "transcript"] as const) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export type SttResult = { text: string; language: string };

/** Transcribe spoken audio in one language. */
export async function nkenneStt(
  config: NkenneClientConfig,
  input: { audio: Blob | ArrayBuffer | Uint8Array; language: NkenneLanguage; filename?: string; mimeType?: string },
): Promise<SttResult> {
  const resolved = resolveConfig(config);
  const candidates = sttLanguageCandidates(input.language);
  const mime = input.mimeType || (input.audio instanceof Blob ? input.audio.type : "audio/wav") || "audio/wav";
  const filename = input.filename || guessFilename(mime);

  let lastError: NkenneError | null = null;
  for (const slug of candidates) {
    const form = new FormData();
    const blob =
      input.audio instanceof Blob
        ? input.audio
        : new Blob([input.audio as BlobPart], { type: mime });
    form.append("audio_file", blob, filename);

    let res: Response;
    try {
      res = await fetchWithTimeout(
        resolved.fetchImpl,
        `${resolved.baseUrl}/api/stt/v1/${slug}/with-api-key`,
        { method: "POST", headers: authHeaders(resolved.apiKey), body: form },
        resolved.timeoutMs,
      );
    } catch (err) {
      lastError = err instanceof NkenneError ? err : new NkenneError("NETWORK", "Could not reach speech service.", 502);
      continue;
    }

    if (!res.ok) {
      // 404 on a candidate slug → try next (pidgin vs nigerian-pidgin).
      if (res.status === 404 && candidates.length > 1) {
        lastError = mapHttpError(res.status, "Speech language not available.");
        continue;
      }
      throw mapHttpError(res.status, "Could not transcribe speech. Please try again.");
    }

    const data = await res.json().catch(() => null);
    const text = parseTranscript(data);
    if (!text) {
      throw new NkenneError("PROVIDER_ERROR", "No speech was detected in the recording.", 400);
    }
    return { text, language: input.language };
  }

  throw lastError ?? new NkenneError("PROVIDER_ERROR", "Could not transcribe speech.", 502);
}

function guessFilename(mime: string): string {
  if (mime.includes("mpeg") || mime.includes("mp3")) return "voice.mp3";
  if (mime.includes("mp4") || mime.includes("m4a")) return "voice.m4a";
  if (mime.includes("ogg")) return "voice.ogg";
  if (mime.includes("webm")) return "voice.webm";
  return "voice.wav";
}

function parseTranslatedSpeech(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  for (const key of ["translated_text", "translatedText", "transcription", "text"] as const) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export type SpeechTranslateResult = {
  translatedText: string;
  fromLanguage: NkenneLanguage;
  toLanguage: NkenneLanguage;
  pair: SpeechTranslatePair;
};

/** Direct speech→translated text when the pair is supported by Speech Studio. */
export async function nkenneSpeechTranslate(
  config: NkenneClientConfig,
  input: {
    audio: Blob | ArrayBuffer | Uint8Array;
    fromLanguage: NkenneLanguage;
    toLanguage: NkenneLanguage;
    filename?: string;
    mimeType?: string;
  },
): Promise<SpeechTranslateResult> {
  const pair = speechTranslatePair(input.fromLanguage, input.toLanguage);
  if (!pair) {
    throw new NkenneError(
      "UNSUPPORTED_LANGUAGE",
      `Speech translation does not support ${input.fromLanguage} → ${input.toLanguage} directly.`,
      400,
    );
  }

  const resolved = resolveConfig(config);
  const mime = input.mimeType || (input.audio instanceof Blob ? input.audio.type : "audio/wav") || "audio/wav";
  const filename = input.filename || guessFilename(mime);
  const form = new FormData();
  const blob =
    input.audio instanceof Blob
      ? input.audio
      : new Blob([input.audio as BlobPart], { type: mime });
  form.append("audio_file", blob, filename);

  const res = await fetchWithTimeout(
    resolved.fetchImpl,
    `${resolved.baseUrl}/api/st/v1/${pair}/with-api-key`,
    { method: "POST", headers: authHeaders(resolved.apiKey), body: form },
    resolved.timeoutMs,
  );

  if (!res.ok) {
    throw mapHttpError(res.status, "Could not translate speech. Please try again.");
  }

  const data = await res.json().catch(() => null);
  const translatedText = parseTranslatedSpeech(data);
  if (!translatedText) {
    throw new NkenneError("PROVIDER_ERROR", "No speech translation was returned.", 502);
  }

  return {
    translatedText,
    fromLanguage: input.fromLanguage,
    toLanguage: input.toLanguage,
    pair,
  };
}

export function isSpeechSupportedLanguage(value: string): value is NkenneLanguage {
  return isNkenneLanguage(value);
}

export type SpeechErrorCode = NkenneErrorCode;
