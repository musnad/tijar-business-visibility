"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Mic, Send, Square, Volume2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { speakText, useSpeechRecognition } from "@/features/translate/use-speech";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { createTransaction } from "@/services/transaction-service";
import { parseVoiceCommand, summarizeDraft, type ParsedVoiceCommand } from "@/utils/voice-intent";
import { formatNgn } from "@/utils/money";

const EXAMPLES = [
  "Record sale 5000 for rice",
  "Record expense 2000 transport",
  "I sold 2 bags of rice for 45000",
  "Bought stock 30000",
];

const SPEAK_LANGS = ["English", "Hausa", "Swahili", "Yoruba"] as const;

export function AssistantScreen() {
  const { profile } = useAuth();
  const { data } = usePrimaryBusiness(profile?.id);
  const business = data?.business ?? null;
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [speakLang, setSpeakLang] = useState<string>("English");
  const [speakReplies, setSpeakReplies] = useState(true);
  const [draft, setDraft] = useState<ParsedVoiceCommand | null>(null);
  const [reply, setReply] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { listen, stop, listening, supported } = useSpeechRecognition();

  function say(text: string) {
    setReply(text);
    if (speakReplies) speakText(text, speakLang);
  }

  function understand(text: string) {
    const cmd = parseVoiceCommand(text);
    setDraft(cmd);
    say(summarizeDraft(cmd));
  }

  async function onMic() {
    try {
      const transcript = await listen(speakLang);
      if (transcript) {
        setInput(transcript);
        understand(transcript);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice failed");
    }
  }

  async function confirmSave() {
    if (!draft || draft.intent === "unknown" || draft.amount === null || !business || !profile) return;
    setSaving(true);
    const { error } = await createTransaction(business.id, profile.id, {
      type: draft.intent,
      amount: draft.amount,
      description: draft.description || undefined,
      paymentMethod: "cash",
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      say("Sorry, I could not save that. Please try again.");
      return;
    }
    toast.success("Record saved.");
    say(`Saved. ${summarizeDraft(draft).replace(". Press Confirm to save.", "")} has been recorded.`);
    setDraft(null);
    setInput("");
    invalidateBusinessQueries(queryClient, business.id);
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="mt-2 text-sm text-muted-foreground">
        Speak or type a record. TIJAR prepares it — <strong>nothing is saved until you confirm</strong>.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold" htmlFor="speak-lang">Speak language</label>
        <select id="speak-lang" value={speakLang} onChange={(e) => setSpeakLang(e.target.value)} className="min-h-10 rounded-xl border border-input bg-background px-2 text-sm">
          {SPEAK_LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={speakReplies} onChange={(e) => setSpeakReplies(e.target.checked)} className="size-4" />
          <Volume2 className="size-4" /> Speak replies
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Record sale 5000 for rice"
          className="min-h-12 flex-1 rounded-xl text-base"
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) understand(input); }}
        />
        {supported && (
          listening ? (
            <Button type="button" variant="destructive" className="min-h-12 rounded-xl" onClick={stop}><Square className="size-5" /></Button>
          ) : (
            <Button type="button" variant="outline" className="min-h-12 rounded-xl" onClick={onMic} aria-label="Speak"><Mic className="size-5" /></Button>
          )
        )}
        <Button type="button" className="min-h-12 rounded-xl" onClick={() => input.trim() && understand(input)} aria-label="Understand"><Send className="size-5" /></Button>
      </div>
      {!supported && <p className="mt-1 text-xs text-muted-foreground">Voice input is not supported on this device — typing works fully.</p>}
      {listening && <p className="mt-1 text-sm font-semibold text-primary">Listening… speak now.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => { setInput(ex); understand(ex); }} className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">
            {ex}
          </button>
        ))}
      </div>

      {reply && (
        <div className="mt-5 rounded-2xl bg-primary/5 p-4" aria-live="polite">
          <p className="text-sm font-semibold text-primary">TIJAR</p>
          <p className="mt-1">{reply}</p>
          <Button type="button" size="sm" variant="ghost" className="mt-1 rounded-lg text-xs" onClick={() => speakText(reply, speakLang)}>
            <Volume2 className="mr-1 size-4" /> Hear it
          </Button>
        </div>
      )}

      {draft && draft.intent !== "unknown" && draft.amount !== null && (
        <div className="mt-4 rounded-2xl border-2 border-primary/40 p-4">
          <p className="font-bold">Check this record</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd className="font-semibold capitalize">{draft.intent.replace("_", " ")}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Amount</dt><dd className="font-extrabold">{formatNgn(draft.amount)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Details</dt><dd className="font-semibold">{draft.description || "—"}</dd></div>
          </dl>
          <div className="mt-3 flex gap-2">
            <Button type="button" className="min-h-12 flex-1 rounded-xl font-bold" disabled={saving || !business} onClick={confirmSave}>
              {saving ? "Saving…" : "Confirm & save"}
            </Button>
            <Button type="button" variant="outline" className="min-h-12 rounded-xl" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
          {!business && <p className="mt-2 text-xs text-destructive">Finish setting up your business first.</p>}
        </div>
      )}
    </div>
  );
}
