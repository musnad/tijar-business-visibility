/**
 * Orchestrates speech (TTS / STT / speech-translate).
 * Prefer OpenAI (ChatGPT) when OPENAI_API_KEY is set; fall back to NKENNEAi.
 * Speech-translate = STT + text translate when direct ST is unavailable.
 */

import { z } from "zod";

import {
  isOpenAiConfigured,
  isOpenAiLanguage,
  openaiStt,
  openaiTts,
  OpenAiError,
  type OpenAiClientConfig,
  type OpenAiLanguage,
} from "@/lib/openai/client";

import { NkenneError, readNkenneConfig, type NkenneClientConfig } from "./client";
import { isNkenneLanguage, type NkenneLanguage } from "./languages";
import { checkRateLimit } from "./rate-limit";
import { translateText } from "./service";
import {
  nkenneSpeechTranslate,
  nkenneStt,
  nkenneTts,
  speechTranslatePair,
  type TtsResult,
} from "./speech";

export const MAX_SPEECH_AUDIO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_SPEECH_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/wave",
  "audio/x-m4a",
  "audio/m4a",
] as const;

export function isAllowedSpeechType(type: string): boolean {
  if (!type) return true; // some browsers omit type
  const base = type.split(";")[0]!.trim().toLowerCase();
  if ((ALLOWED_SPEECH_TYPES as readonly string[]).includes(base)) return true;
  // e.g. audio/webm;codecs=opus already stripped — also accept vendor prefixes
  return base.startsWith("audio/");
}

const speakSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  language: z.string().trim().min(1).max(40),
  // Official TTS docs: speaking_rate range 0.5–2.0
  speakingRate: z.number().min(0.5).max(2).optional(),
});

export type SpeakDeps = {
  clientConfig?: NkenneClientConfig;
  openAiConfig?: OpenAiClientConfig;
  preferNkenne?: boolean;
  rateLimitKey?: string;
  rateLimit?: number;
};

export type SpeakResult =
  | { ok: true; audio: TtsResult; language: string }
  | { ok: false; status: number; code: string; message: string };

function shouldUseOpenAi(deps: SpeakDeps): boolean {
  if (deps.preferNkenne) return false;
  if (deps.openAiConfig?.apiKey) return true;
  if (deps.clientConfig) return false;
  return isOpenAiConfigured();
}

function isSpeechLanguage(value: string, allowOpenAi: boolean): boolean {
  if (allowOpenAi && isOpenAiLanguage(value)) return true;
  return isNkenneLanguage(value);
}

export async function speakTextServer(raw: unknown, deps: SpeakDeps = {}): Promise<SpeakResult> {
  const parsed = speakSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION",
      message: parsed.error.errors[0]?.message ?? "Invalid speak request.",
    };
  }

  const useOpenAi = shouldUseOpenAi(deps);
  if (!isSpeechLanguage(parsed.data.language, useOpenAi)) {
    return {
      ok: false,
      status: 400,
      code: "UNSUPPORTED_LANGUAGE",
      message: `Speech does not support "${parsed.data.language}" yet.`,
    };
  }

  if (deps.rateLimitKey) {
    const limit = checkRateLimit(deps.rateLimitKey, deps.rateLimit ?? 20);
    if (!limit.allowed) {
      return {
        ok: false,
        status: 429,
        code: "RATE_LIMITED",
        message: `Too many speak requests. Try again in ${limit.retryAfterSeconds}s.`,
      };
    }
  }

  // 1) OpenAI TTS
  if (useOpenAi) {
    try {
      const audio = await openaiTts(deps.openAiConfig ?? {}, {
        text: parsed.data.text,
        language: parsed.data.language,
        speakingRate: parsed.data.speakingRate,
      });
      return { ok: true, audio, language: parsed.data.language };
    } catch (err) {
      if (!isNkenneLanguage(parsed.data.language)) {
        if (err instanceof OpenAiError) {
          return { ok: false, status: err.status, code: err.code, message: err.message };
        }
        return { ok: false, status: 502, code: "PROVIDER_ERROR", message: "Speech failed. Please try again." };
      }
      // else fall through to NKENNE for supported languages
    }
  }

  if (!isNkenneLanguage(parsed.data.language)) {
    return {
      ok: false,
      status: 400,
      code: "UNSUPPORTED_LANGUAGE",
      message: `Speech does not support "${parsed.data.language}" yet.`,
    };
  }

  const env = readNkenneConfig();
  const config: NkenneClientConfig = deps.clientConfig ?? {
    apiKey: env.apiKey ?? undefined,
    baseUrl: env.baseUrl,
  };

  try {
    const audio = await nkenneTts(config, {
      text: parsed.data.text,
      language: parsed.data.language,
      speakingRate: parsed.data.speakingRate,
    });
    return { ok: true, audio, language: parsed.data.language };
  } catch (err) {
    if (err instanceof NkenneError) {
      return { ok: false, status: err.status, code: err.code, message: err.message };
    }
    return { ok: false, status: 502, code: "PROVIDER_ERROR", message: "Speech failed. Please try again." };
  }
}

export type TranscribeResult =
  | {
      ok: true;
      transcript: string;
      language: string;
      mode: "stt" | "speech-translate";
      translatedText?: string;
    }
  | { ok: false; status: number; code: string; message: string };

export type TranscribeInput = {
  audio: Blob;
  language: string;
  /** When set with a different language, prefer speech-translate (or STT+text). */
  toLanguage?: string;
};

export async function transcribeOrTranslateSpeech(
  input: TranscribeInput,
  deps: SpeakDeps = {},
): Promise<TranscribeResult> {
  if (!(input.audio instanceof Blob) || input.audio.size === 0) {
    return { ok: false, status: 400, code: "VALIDATION", message: "Audio recording is required." };
  }
  if (input.audio.size > MAX_SPEECH_AUDIO_BYTES) {
    return {
      ok: false,
      status: 400,
      code: "AUDIO_TOO_LARGE",
      message: "Recording is too large (max 5 MB / about 60 seconds).",
    };
  }
  if (input.audio.type && !isAllowedSpeechType(input.audio.type)) {
    return {
      ok: false,
      status: 400,
      code: "AUDIO_UNSUPPORTED",
      message: `Audio type ${input.audio.type} is not supported.`,
    };
  }

  const useOpenAi = shouldUseOpenAi(deps);
  if (!isSpeechLanguage(input.language, useOpenAi)) {
    return {
      ok: false,
      status: 400,
      code: "UNSUPPORTED_LANGUAGE",
      message: `Speech does not support "${input.language}" yet. Use English, Yoruba, Hausa, Igbo, Swahili, or Nigerian Pidgin.`,
    };
  }

  if (deps.rateLimitKey) {
    const limit = checkRateLimit(deps.rateLimitKey, deps.rateLimit ?? 10);
    if (!limit.allowed) {
      return {
        ok: false,
        status: 429,
        code: "RATE_LIMITED",
        message: `Too many voice requests. Try again in ${limit.retryAfterSeconds}s.`,
      };
    }
  }

  const from = input.language;
  const toRaw = input.toLanguage?.trim();
  const to =
    toRaw && toRaw !== from && isSpeechLanguage(toRaw, useOpenAi) ? toRaw : null;

  // 1) OpenAI: Whisper STT (+ optional ChatGPT text translate)
  if (useOpenAi) {
    try {
      const stt = await openaiStt(deps.openAiConfig ?? {}, {
        audio: input.audio,
        language: isOpenAiLanguage(from) ? (from as OpenAiLanguage) : undefined,
        mimeType: input.audio.type || undefined,
      });

      if (!to) {
        return { ok: true, transcript: stt.text, language: from, mode: "stt" };
      }

      const translated = await translateText(
        { text: stt.text, fromLanguage: from, toLanguage: to },
        { openAiConfig: deps.openAiConfig, preferNkenne: deps.preferNkenne },
      );
      if (!translated.ok) {
        return { ok: true, transcript: stt.text, language: from, mode: "stt" };
      }
      return {
        ok: true,
        transcript: stt.text,
        translatedText: translated.translatedText,
        language: to,
        mode: "speech-translate",
      };
    } catch (err) {
      if (!isNkenneLanguage(from)) {
        if (err instanceof OpenAiError) {
          return { ok: false, status: err.status, code: err.code, message: err.message };
        }
        return {
          ok: false,
          status: 502,
          code: "PROVIDER_ERROR",
          message: "Could not process speech. Please try again.",
        };
      }
      // fall through to NKENNE
    }
  }

  if (!isNkenneLanguage(from)) {
    return {
      ok: false,
      status: 400,
      code: "UNSUPPORTED_LANGUAGE",
      message: `Speech does not support "${from}" yet.`,
    };
  }

  const env = readNkenneConfig();
  const config: NkenneClientConfig = deps.clientConfig ?? {
    apiKey: env.apiKey ?? undefined,
    baseUrl: env.baseUrl,
  };

  const toNkenne =
    to && isNkenneLanguage(to) && to !== from ? (to as NkenneLanguage) : null;

  // 2) Direct NKENNE Speech Translations when the pair is supported.
  if (toNkenne && speechTranslatePair(from, toNkenne)) {
    try {
      const st = await nkenneSpeechTranslate(config, {
        audio: input.audio,
        fromLanguage: from,
        toLanguage: toNkenne,
        mimeType: input.audio.type || undefined,
      });
      return {
        ok: true,
        transcript: st.translatedText,
        translatedText: st.translatedText,
        language: toNkenne,
        mode: "speech-translate",
      };
    } catch {
      // Beta upstream often 503 — fall through to STT + text.
    }
  }

  // 3) NKENNE STT in source language (+ optional text translate).
  try {
    const stt = await nkenneStt(config, {
      audio: input.audio,
      language: from,
      mimeType: input.audio.type || undefined,
    });

    if (!to) {
      return { ok: true, transcript: stt.text, language: from, mode: "stt" };
    }

    const translated = await translateText(
      { text: stt.text, fromLanguage: from, toLanguage: to },
      { clientConfig: config, preferNkenne: true },
    );
    if (!translated.ok) {
      return {
        ok: true,
        transcript: stt.text,
        language: from,
        mode: "stt",
      };
    }
    return {
      ok: true,
      transcript: stt.text,
      translatedText: translated.translatedText,
      language: to,
      mode: "stt",
    };
  } catch (err) {
    if (err instanceof NkenneError) {
      return { ok: false, status: err.status, code: err.code, message: err.message };
    }
    return {
      ok: false,
      status: 502,
      code: "PROVIDER_ERROR",
      message: "Could not process speech. Please try again.",
    };
  }
}
