"use client";

import { useCallback, useRef, useState } from "react";

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
  const base = primary.split("-")[0];
  const candidates = [primary, base, "en-NG", "en-US"].filter(
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
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speakText(text: string, languageName: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = SPEECH_LOCALES[languageName] ?? "en-NG";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
  return true;
}

function listenOnce(locale: string, isSecure: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      reject(new Error("Voice input is not supported on this device or browser. Please type instead."));
      return;
    }
    const rec = new Ctor();
    let settled = false;
    rec.lang = locale;
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i]?.[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript && !settled) {
        settled = true;
        resolve(transcript);
      }
    };
    rec.onerror = (e) => {
      if (!settled) {
        settled = true;
        const err = new Error(mapRecognitionError(e?.error, isSecure));
        (err as Error & { code?: string }).code = e?.error ?? "unknown";
        reject(err);
      }
    };
    rec.onend = () => {
      if (!settled) {
        settled = true;
        reject(new Error(mapRecognitionError("no-speech", isSecure)));
      }
    };
    try {
      rec.start();
    } catch {
      if (!settled) {
        settled = true;
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
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const activeRef = useRef(false);

  const listen = useCallback(async (languageName: string): Promise<string> => {
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
    const candidates = speechLocaleCandidates(languageName);
    let lastError: Error | null = null;
    try {
      for (const locale of candidates) {
        try {
          return await listenOnce(locale, isSecure);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Voice failed.");
          const code = (err as Error & { code?: string }).code;
          // Only retry on locale/network problems; permission etc. fail fast.
          if (code !== "language-not-supported" && code !== "network") break;
        }
      }
      throw lastError ?? new Error(mapRecognitionError(undefined, isSecure));
    } finally {
      activeRef.current = false;
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    setListening(false);
  }, []);

  return { listen, stop, listening, supported };
}
