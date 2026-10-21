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

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
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

/**
 * Explicit push-to-talk recognition. Never continuous/background:
 * one press records one utterance, then stops.
 */
export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const recRef = useRef<RecognitionLike | null>(null);

  const listen = useCallback((languageName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        reject(new Error("Voice input is not supported on this device. Please type instead."));
        return;
      }
      const rec = new Ctor();
      recRef.current = rec;
      rec.lang = SPEECH_LOCALES[languageName] ?? "en-NG";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        resolve(transcript);
      };
      rec.onerror = () => reject(new Error("Could not hear you clearly. Please try again or type."));
      rec.onend = () => setListening(false);
      setListening(true);
      try {
        rec.start();
      } catch {
        setListening(false);
        reject(new Error("Microphone is busy. Please try again."));
      }
    });
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listen, stop, listening, supported };
}
