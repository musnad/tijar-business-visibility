"use client";

import { Mic, Square } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

const MAX_SECONDS = 60;

/**
 * Explicit, user-initiated voice recording (never continuous listening).
 * Audio goes only to our server endpoint (/api/translate-speech), which
 * currently reports voice as unavailable because the documented NKENNEAi
 * API is text-only. The transcript, when available, is always shown for
 * review before the user chooses to use it.
 */
export function VoiceTranslate({ onUseTranscript }: { onUseTranscript: (text: string) => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "recording"; seconds: number }
    | { kind: "processing" }
    | { kind: "done"; transcript: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState({ kind: "error", message: t("app.translator.voiceNotSupported") });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        void upload(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.start();
      let seconds = 0;
      setState({ kind: "recording", seconds });
      timerRef.current = setInterval(() => {
        seconds += 1;
        setState({ kind: "recording", seconds });
        if (seconds >= MAX_SECONDS) stop();
      }, 1000);
    } catch {
      setState({ kind: "error", message: t("app.translator.micDenied") });
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  async function upload(blob: Blob) {
    if (blob.size > 5 * 1024 * 1024) {
      setState({ kind: "error", message: t("app.translator.recordingTooLarge") });
      return;
    }
    setState({ kind: "processing" });
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const res = await fetch("/api/translate-speech", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as
        | { transcript?: string; error?: { message: string } }
        | null;
      if (res.ok && body?.transcript) {
        setState({ kind: "done", transcript: body.transcript });
      } else {
        setState({
          kind: "error",
          message: body?.error?.message ?? t("app.translator.voiceProcessingFailed"),
        });
      }
    } catch {
      setState({ kind: "error", message: t("app.translator.voiceServiceUnreachable") });
    }
  }

  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="flex items-center gap-2">
        {state.kind === "recording" ? (
          <Button type="button" size="sm" variant="destructive" className="min-h-10 rounded-xl" onClick={stop}>
            <Square className="mr-1 size-4" /> {t("app.translator.stopWithSeconds").replace("{seconds}", String(state.seconds))}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" className="min-h-10 rounded-xl" onClick={start} disabled={state.kind === "processing"}>
            <Mic className="mr-1 size-4" /> {state.kind === "processing" ? t("app.translator.processing") : t("app.translator.recordVoice")}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">{t("app.translator.maxSixtyHint")}</span>
      </div>
      {state.kind === "done" && (
        <div className="mt-2 text-sm">
          <p className="font-semibold">{t("app.translator.transcriptLabel")}</p>
          <p className="mt-0.5">{state.transcript}</p>
          <Button type="button" size="sm" className="mt-2 min-h-9 rounded-lg text-xs" onClick={() => onUseTranscript(state.transcript)}>
            {t("app.translator.useThisText")}
          </Button>
        </div>
      )}
      {state.kind === "error" && <p className="mt-2 text-xs text-destructive">{state.message}</p>}
    </div>
  );
}
