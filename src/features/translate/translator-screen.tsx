"use client";

import { ArrowLeftRight, Mic, Send, Square, Volume2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NKENNE_LANGUAGES, type NkenneLanguage } from "@/lib/nkenne/languages";
import { translateTextClient } from "@/services/translate-service";
import { speakText, useSpeechRecognition } from "./use-speech";

type Turn = {
  speaker: "A" | "B";
  original: string;
  originalLang: string;
  translated: string;
  translatedLang: string;
};

/**
 * Two-person conversation translator. Each person speaks/types in their
 * language; the other hears/reads it in theirs. Originals are always
 * preserved. Hausa voice works via the phone's speech engine; Hausa
 * text translation appears when NKENNEAi documents Hausa support.
 */
const LANG_OPTIONS = ["English", "Hausa", "Swahili", "Yoruba", "Nigerian Pidgin"] as const;

export function TranslatorScreen() {
  const [langA, setLangA] = useState<string>("Hausa");
  const [langB, setLangB] = useState<string>("English");
  const [draftA, setDraftA] = useState("");
  const [draftB, setDraftB] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const { listen, stop, listening, supported } = useSpeechRecognition();

  async function speakAs(speaker: "A" | "B") {
    const lang = speaker === "A" ? langA : langB;
    try {
      const transcript = await listen(lang);
      if (speaker === "A") setDraftA(transcript);
      else setDraftB(transcript);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice failed");
    }
  }

  async function send(speaker: "A" | "B") {
    const text = (speaker === "A" ? draftA : draftB).trim();
    if (!text) return;
    const from = speaker === "A" ? langA : langB;
    const to = speaker === "A" ? langB : langA;
    setBusy(true);
    const result = await translateTextClient({
      text,
      fromLanguage: from as NkenneLanguage,
      toLanguage: to as NkenneLanguage,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const turn: Turn = {
      speaker,
      original: text,
      originalLang: from,
      translated: result.translatedText,
      translatedLang: to,
    };
    setTurns((prev) => [...prev, turn]);
    speakText(turn.translated, to);
    if (speaker === "A") setDraftA("");
    else setDraftB("");
  }

  function swap() {
    setLangA(langB);
    setLangB(langA);
  }

  function panel(speaker: "A" | "B") {
    const lang = speaker === "A" ? langA : langB;
    const setLang = speaker === "A" ? setLangA : setLangB;
    const draft = speaker === "A" ? draftA : draftB;
    const setDraft = speaker === "A" ? setDraftA : setDraftB;
    return (
      <div className="flex-1 rounded-2xl border border-border p-4">
        <p className="font-bold">Person {speaker}</p>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-2" aria-label={`Person ${speaker} language`}>
          {LANG_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={speaker === "A" ? "Type or speak…" : "Type or speak…"}
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
        />
        <div className="mt-2 flex gap-2">
          {supported && (
            listening ? (
              <Button type="button" variant="destructive" className="min-h-11 flex-1 rounded-xl" onClick={stop}><Square className="mr-1 size-4" /> Stop</Button>
            ) : (
              <Button type="button" variant="outline" className="min-h-11 flex-1 rounded-xl" onClick={() => speakAs(speaker)}><Mic className="mr-1 size-4" /> Speak</Button>
            )
          )}
          <Button type="button" className="min-h-11 flex-1 rounded-xl font-bold" disabled={busy || !draft.trim()} onClick={() => send(speaker)}>
            <Send className="mr-1 size-4" /> Translate & speak
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Translator</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Talk with a customer or seller across languages. Each message is translated and spoken aloud. Original messages are kept.
      </p>

      <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
        {panel("A")}
        <Button type="button" variant="ghost" className="mx-auto min-h-11 rounded-full" onClick={swap} aria-label="Swap languages">
          <ArrowLeftRight className="size-5" />
        </Button>
        {panel("B")}
      </div>

      <section className="mt-6 space-y-3" aria-live="polite">
        {turns.map((turn, i) => (
          <article key={i} className={`max-w-[85%] rounded-2xl p-3 ${turn.speaker === "A" ? "bg-primary/10" : "ms-auto bg-muted"}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Person {turn.speaker} · {turn.originalLang}
            </p>
            <p className="mt-0.5">{turn.original}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {turn.translatedLang} translation
            </p>
            <p className="mt-0.5 font-semibold">{turn.translated}</p>
            <Button type="button" size="sm" variant="ghost" className="mt-1 min-h-8 rounded-lg text-xs" onClick={() => speakText(turn.translated, turn.translatedLang)}>
              <Volume2 className="mr-1 size-3.5" /> Hear it
            </Button>
          </article>
        ))}
        {turns.length === 0 && <p className="text-center text-sm text-muted-foreground">No conversation yet. One person speaks, the other hears it in their language.</p>}
      </section>
    </div>
  );
}
