"use client";

import { Mic, Square, Volume2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { speakText, stopSpeaking, useSpeechPlayback, useSpeechRecognition } from "@/features/translate/use-speech";
import { useTranslation } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import { isSpokenSubmit, matchSpokenOption } from "@/utils/learn-voice-match";

function speakLangForLocale(locale: Locale): string {
  if (locale === "yo") return "Yoruba";
  if (locale === "sw") return "Swahili";
  if (locale === "ha") return "Hausa";
  return "English";
}

type LearnVoiceControlsProps = {
  /** Text to read aloud (question / story). */
  readText: string;
  /** When set, mic picks an answer among these labels. */
  optionLabels?: string[];
  disabled?: boolean;
  autoRead?: boolean;
  onPickOption?: (index: number) => void;
  /** Multi-select: toggle option; speak "check" to submit. */
  onToggleOption?: (index: number) => void;
  onSpokenSubmit?: () => void;
  className?: string;
};

/**
 * Hear the question + speak the answer for Learn quiz / story steps.
 */
export function LearnVoiceControls({
  readText,
  optionLabels,
  disabled,
  autoRead = true,
  onPickOption,
  onToggleOption,
  onSpokenSubmit,
  className,
}: LearnVoiceControlsProps) {
  const { t, locale } = useTranslation();
  const lang = speakLangForLocale(locale);
  const { speaking, stop } = useSpeechPlayback();
  const { listen, stop: stopListen, listening, supported } = useSpeechRecognition();
  const lastAutoKey = useRef<string>("");

  useEffect(() => {
    if (!autoRead || !readText.trim() || disabled) return;
    const key = readText.slice(0, 200);
    if (lastAutoKey.current === key) return;
    lastAutoKey.current = key;
    void speakText(readText, lang, { rate: 0.92 });
    return () => {
      stopSpeaking();
    };
  }, [autoRead, readText, lang, disabled]);

  async function onHear() {
    if (speaking) {
      stop();
      return;
    }
    if (!readText.trim()) return;
    await speakText(readText, lang, { rate: 0.92 });
  }

  async function onSpeakAnswer() {
    if (!optionLabels?.length && !onSpokenSubmit) return;
    try {
      stopSpeaking();
      const transcript = await listen(lang);
      if (!transcript.trim()) return;

      if (onSpokenSubmit && isSpokenSubmit(transcript)) {
        onSpokenSubmit();
        return;
      }

      if (optionLabels?.length) {
        const idx = matchSpokenOption(transcript, optionLabels);
        if (idx == null) {
          toast.message(t("app.learn.voiceNoMatch"));
          return;
        }
        if (onToggleOption) onToggleOption(idx);
        else onPickOption?.(idx);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.learn.voiceFailed"));
    }
  }

  const canAnswer = Boolean(optionLabels?.length) && !disabled && (onPickOption || onToggleOption);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-10 rounded-full px-3 text-xs font-bold"
        onClick={() => void onHear()}
        disabled={!readText.trim()}
      >
        {speaking ? (
          <>
            <Square className="mr-1 size-3.5 fill-current" /> {t("app.learn.voiceStop")}
          </>
        ) : (
          <>
            <Volume2 className="mr-1 size-3.5" /> {t("app.learn.voiceHear")}
          </>
        )}
      </Button>
      {supported && canAnswer && (
        listening ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="min-h-10 rounded-full px-3 text-xs font-bold"
            onClick={stopListen}
          >
            <Square className="mr-1 size-3.5" /> {t("app.learn.voiceStop")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="min-h-10 rounded-full bg-teal-700 px-3 text-xs font-bold hover:bg-teal-800"
            onClick={() => void onSpeakAnswer()}
          >
            <Mic className="mr-1 size-3.5" /> {t("app.learn.voiceAnswer")}
          </Button>
        )
      )}
    </div>
  );
}
