"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** BCP-47 codes for browser speech engines (distinct from NKENNE API names). */
export const SPEECH_LOCALES: Record<string, string> = {
  English: "en-NG",
  Hausa: "ha-NG",
  Swahili: "sw-KE",
  Yoruba: "yo-NG",
  "Nigerian Pidgin": "en-NG",
};

/** Fallback chain when a device lacks the exact locale (common on Android). */
export function speechLocaleCandidates(languageName: string): string[] {
  const primary = SPEECH_LOCALES[languageName] ?? "en-NG";
  const base = primary.split("-")[0] ?? primary;
  const candidates = [primary, base, "en-NG", "en-GB", "en-US", "en"].filter(
    (v, i, arr) => v && arr.indexOf(v) === i,
  );
  return candidates;
}

export function mapRecognitionError(error: string | undefined, isSecure: boolean): string {
  if (!isSecure) {
    return "Voice needs a secure page. Open Tijar with https:// (or localhost), then allow the microphone.";
  }
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone is blocked. Allow microphone permission for this site in your browser settings, then try again.";
    case "audio-capture":
      return "No microphone was found on this device. You can type instead.";
    case "no-speech":
      return "I did not hear anything. Tap the microphone, speak clearly, then stop.";
    case "network":
      return "Voice service needs internet on this phone. Check your connection, or type instead.";
    case "language-not-supported":
      return "This phone does not support that voice language yet. English voice or typing will work.";
    case "aborted":
      return "Listening was stopped. Tap the microphone when you are ready.";
    default:
      return "Could not hear you clearly. Please try again or type.";
  }
}

type RecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function recognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** Score a system voice for a target BCP-47 tag (higher = better). */
export function scoreVoiceForLocale(voice: SpeechSynthesisVoice, locale: string): number {
  const want = locale.toLowerCase();
  const wantBase = want.split("-")[0] ?? want;
  const have = (voice.lang || "").toLowerCase();
  const haveBase = have.split("-")[0] ?? have;
  let score = 0;
  if (have === want) score += 100;
  else if (haveBase === wantBase) score += 60;
  else if (have.startsWith(wantBase)) score += 40;
  else return -1;
  if (voice.localService) score += 15;
  if (/neural|natural|premium|enhanced/i.test(voice.name)) score += 10;
  if (/google|microsoft|apple|samsung/i.test(voice.name)) score += 5;
  // Prefer Nigerian / African English when asking for en-NG / Pidgin
  if (want.startsWith("en") && /ng|nigeria|africa/i.test(`${have} ${voice.name}`)) score += 20;
  return score;
}

export function pickBestVoice(languageName: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const locales = speechLocaleCandidates(languageName);
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const locale of locales) {
    for (const voice of voices) {
      const score = scoreVoiceForLocale(voice, locale);
      if (score > bestScore) {
        bestScore = score;
        best = voice;
      }
    }
    if (bestScore >= 100) break; // exact match found
  }
  return best;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.onvoiceschanged = finish;
    // Some browsers never fire the event — don't hang forever.
    window.setTimeout(finish, 400);
  });
}

/** Keep the last utterance referenced so Chrome does not GC it mid-speech. */
let activeUtterance: SpeechSynthesisUtterance | null = null;
const speakingListeners = new Set<(speaking: boolean) => void>();

function notifySpeaking(speaking: boolean) {
  for (const listener of speakingListeners) listener(speaking);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
  notifySpeaking(false);
}

export function isSpeakingNow(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking || window.speechSynthesis.pending;
}

export type SpeakOptions = {
  /** 0.1–2, default ~0.95 for clear shop-owner pace */
  rate?: number;
  pitch?: number;
  volume?: number;
};

/**
 * Speak text aloud in the best available system voice for the language.
 * Cancels any current speech first. Returns false if TTS is unavailable.
 */
export async function speakText(
  text: string,
  languageName: string,
  options: SpeakOptions = {},
): Promise<boolean> {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || !speechSupported()) return false;

  const synth = window.speechSynthesis;
  // Stop mic-overlap and Chrome stuck-paused state.
  try {
    synth.cancel();
    synth.resume();
  } catch {
    /* ignore */
  }

  const voices = await loadVoices();
  const locale = SPEECH_LOCALES[languageName] ?? "en-NG";
  const voice = pickBestVoice(languageName, voices);

  const utter = new SpeechSynthesisUtterance(cleaned);
  utter.lang = voice?.lang || locale;
  if (voice) utter.voice = voice;
  utter.rate = options.rate ?? 0.95;
  utter.pitch = options.pitch ?? 1;
  utter.volume = options.volume ?? 1;

  activeUtterance = utter;
  notifySpeaking(true);

  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (activeUtterance === utter) activeUtterance = null;
      notifySpeaking(false);
      resolve(ok);
    };
    utter.onend = () => finish(true);
    utter.onerror = () => finish(false);

    // Chrome sometimes drops the first utterance after cancel — nudge it.
    try {
      synth.speak(utter);
      if (synth.paused) synth.resume();
      window.setTimeout(() => {
        if (synth.paused) synth.resume();
      }, 50);
    } catch {
      finish(false);
    }
  });
}

/**
 * Hook: speaking state for Hear-it buttons and auto-replies.
 */
export function useSpeechPlayback() {
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => speechSupported());

  useEffect(() => {
    speakingListeners.add(setSpeaking);
    setSpeaking(isSpeakingNow());
    return () => {
      speakingListeners.delete(setSpeaking);
    };
  }, []);

  const speak = useCallback(async (text: string, languageName: string, options?: SpeakOptions) => {
    return speakText(text, languageName, options);
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
  }, []);

  return { speak, stop, speaking, supported };
}

function listenOnce(
  locale: string,
  isSecure: boolean,
  onInstance: (rec: RecognitionLike | null) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      reject(new Error("Voice input is not supported on this device or browser. Please type instead."));
      return;
    }
    const rec = new Ctor();
    let settled = false;
    onInstance(rec);
    rec.lang = locale;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalTranscript = "";

    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i]?.[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) finalTranscript = transcript;
    };

    rec.onerror = (e) => {
      if (!settled) {
        settled = true;
        onInstance(null);
        if (e?.error === "aborted") {
          reject(Object.assign(new Error(mapRecognitionError("aborted", isSecure)), { code: "aborted" }));
          return;
        }
        const err = new Error(mapRecognitionError(e?.error, isSecure));
        (err as Error & { code?: string }).code = e?.error ?? "unknown";
        reject(err);
      }
    };
    rec.onend = () => {
      onInstance(null);
      if (settled) return;
      settled = true;
      const text = finalTranscript.trim();
      if (text) resolve(text);
      else reject(Object.assign(new Error(mapRecognitionError("no-speech", isSecure)), { code: "no-speech" }));
    };
    try {
      // Don't let TTS talk over the mic.
      stopSpeaking();
      rec.start();
    } catch {
      if (!settled) {
        settled = true;
        onInstance(null);
        reject(new Error("Microphone is busy. Wait a second and try again."));
      }
    }
  });
}

/**
 * Explicit push-to-talk recognition. Never continuous/background:
 * one press records one utterance, then stops. Automatically retries
 * with a fallback voice locale when the phone lacks the exact one.
 */
export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => recognitionSupported());
  const activeRef = useRef(false);
  const recRef = useRef<RecognitionLike | null>(null);

  const stop = useCallback(() => {
    activeRef.current = false;
    setListening(false);
    try {
      recRef.current?.stop();
      recRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  const listen = useCallback(
    async (languageName: string): Promise<string> => {
      if (activeRef.current) {
        throw new Error("Already listening — speak now, or stop first.");
      }
      const isSecure = typeof window === "undefined" ? true : window.isSecureContext;
      if (!isSecure) {
        throw new Error(mapRecognitionError("not-allowed", false));
      }
      if (!getRecognitionCtor()) {
        throw new Error("Voice input is not supported on this device or browser. Please type instead.");
      }

      activeRef.current = true;
      setListening(true);
      stopSpeaking();
      const candidates = speechLocaleCandidates(languageName);
      let lastError: Error | null = null;
      try {
        for (const locale of candidates) {
          if (!activeRef.current) {
            throw Object.assign(new Error(mapRecognitionError("aborted", isSecure)), { code: "aborted" });
          }
          try {
            return await listenOnce(locale, isSecure, (rec) => {
              recRef.current = rec;
            });
          } catch (err) {
            lastError = err instanceof Error ? err : new Error("Voice failed.");
            const code = (err as Error & { code?: string }).code;
            if (code === "aborted") throw lastError;
            // Only retry on locale/network problems; permission etc. fail fast.
            if (code !== "language-not-supported" && code !== "network") break;
          }
        }
        throw lastError ?? new Error(mapRecognitionError(undefined, isSecure));
      } finally {
        activeRef.current = false;
        recRef.current = null;
        setListening(false);
      }
    },
    [],
  );

  return { listen, stop, listening, supported };
}
