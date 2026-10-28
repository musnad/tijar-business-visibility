"use client";

import { Check, Mic, Square, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { startAudioRecording } from "@/features/translate/use-speech";
import { speakText } from "@/features/translate/use-speech";
import { OPENAI_TTS_VOICES, type OpenAiTtsVoice } from "@/lib/openai/voices";
import { VOICE_ENROLL_SCRIPT, writePersonalVoicePrefs } from "@/lib/voice/personal-voice";
import { cn } from "@/lib/utils";
import { saveVoiceProfile, uploadVoiceSample } from "@/services/voice-sample-service";

type Props = {
  profileId: string;
  lang: string;
  onDone: (result: { preferredVoice: OpenAiTtsVoice; customVoiceId: string | null }) => void;
  onSkip: () => void;
};

export function VoiceEnrollCard({ profileId, lang, onDone, onSkip }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasSample, setHasSample] = useState(false);
  const [preferred, setPreferred] = useState<OpenAiTtsVoice>("nova");
  const [customVoiceId, setCustomVoiceId] = useState<string | null>(null);
  const stopRef = useRef<(() => Promise<Blob>) | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const blobRef = useRef<Blob | null>(null);

  async function startRec() {
    try {
      const session = await startAudioRecording();
      stopRef.current = session.stop;
      cancelRef.current = session.cancel;
      setRecording(true);
      toast.message("Speak clearly for about 12 seconds…");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open microphone.");
    }
  }

  async function stopRec() {
    const stopper = stopRef.current;
    stopRef.current = null;
    cancelRef.current = null;
    setRecording(false);
    if (!stopper) return;
    setBusy(true);
    try {
      const blob = await stopper();
      blobRef.current = blob;
      const uploaded = await uploadVoiceSample(profileId, blob);
      if (uploaded.error || !uploaded.path) {
        toast.error(uploaded.error ?? "Upload failed");
        setBusy(false);
        return;
      }

      // Try server-side personal clone (ElevenLabs when configured).
      let customVoiceId: string | null = null;
      try {
        const form = new FormData();
        form.append("audio", blob, "sample.webm");
        form.append("name", "TIJAR shopkeeper");
        const res = await fetch("/api/voice-enroll", { method: "POST", body: form });
        const body = (await res.json().catch(() => null)) as {
          voiceId?: string | null;
          message?: string;
          error?: { message?: string };
        } | null;
        if (res.ok && body?.voiceId) {
          customVoiceId = body.voiceId;
          setCustomVoiceId(body.voiceId);
          toast.success("Your personal voice is ready.");
        } else if (body?.message) {
          toast.message(body.message);
        }
      } catch {
        /* OpenAI preferred voice still works */
      }

      writePersonalVoicePrefs({
        voiceSamplePath: uploaded.path,
        preferredTtsVoice: preferred,
        customVoiceId,
      });
      await saveVoiceProfile(profileId, {
        voiceSamplePath: uploaded.path,
        preferredTtsVoice: preferred,
        customVoiceId,
      });
      setHasSample(true);
      if (!customVoiceId) {
        toast.success("Voice saved. Pick how TIJAR should sound, then continue.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save voice.");
    } finally {
      setBusy(false);
    }
  }

  async function previewVoice(v: OpenAiTtsVoice) {
    setPreferred(v);
    writePersonalVoicePrefs({ preferredTtsVoice: v });
    await speakText("Hello — this is how TIJAR will speak with you.", lang, { voice: v });
  }

  async function finish() {
    setBusy(true);
    await saveVoiceProfile(profileId, {
      preferredTtsVoice: preferred,
      customVoiceId,
    });
    writePersonalVoicePrefs({ preferredTtsVoice: preferred, customVoiceId });
    setBusy(false);
    onDone({ preferredVoice: preferred, customVoiceId });
  }

  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-extrabold">Save your voice</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Record a short sample. TIJAR will use your personal voice for speak-back across the app
        (or your preferred voice until a clone is ready).
      </p>

      <div className="mt-4 rounded-2xl bg-muted/60 p-3 text-sm leading-relaxed">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Please say</p>
        <p className="mt-1 font-medium">{VOICE_ENROLL_SCRIPT}</p>
      </div>

      <div className="mt-5 flex flex-col items-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => (recording ? void stopRec() : void startRec())}
          className={cn(
            "flex size-20 items-center justify-center rounded-full text-primary-foreground shadow-lg active:scale-95 disabled:opacity-50",
            recording ? "bg-destructive" : "bg-teal-700",
          )}
        >
          {recording ? <Square className="size-7" /> : <Mic className="size-8" />}
        </button>
        <p className="mt-3 text-sm font-semibold">
          {recording ? "Recording… tap to stop" : hasSample ? "Sample saved" : "Tap to record"}
        </p>
      </div>

      {hasSample && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Choose a TIJAR speak voice
          </p>
          <div className="flex flex-wrap gap-2">
            {OPENAI_TTS_VOICES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => void previewVoice(v)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold capitalize",
                  preferred === v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background",
                )}
              >
                <Volume2 className="mr-1 inline size-3.5" />
                {v}
              </button>
            ))}
          </div>
          <Button
            type="button"
            className="min-h-12 w-full rounded-2xl font-bold"
            disabled={busy}
            onClick={() => void finish()}
          >
            <Check className="mr-1.5 size-4" /> Continue with my voice
          </Button>
        </div>
      )}

      <button
        type="button"
        className="mt-4 w-full text-center text-sm font-semibold text-muted-foreground underline-offset-2 hover:underline"
        onClick={onSkip}
      >
        Skip for now
      </button>
    </section>
  );
}
