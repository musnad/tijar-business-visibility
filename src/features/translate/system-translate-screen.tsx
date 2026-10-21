"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NKENNE_LANGUAGES, type NkenneLanguage } from "@/lib/nkenne/languages";

/**
 * Admin tool to translate Tijar system/UI strings with NKENNEAi.
 * Output is reviewed by a human, then committed into
 * src/lib/i18n/messages/*.ts — runtime UI never machine-translates
 * silently. Hausa UI strings are maintained in messages/ha.ts because
 * the documented NKENNEAi API does not include Hausa yet.
 */
export function SystemTranslateScreen() {
  const [source, setSource] = useState("Fresh rice\nHow much is this?\nThank you, come again");
  const [from, setFrom] = useState<NkenneLanguage>("English");
  const [to, setTo] = useState<NkenneLanguage>("Swahili");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    const texts = source.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
    if (texts.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/translate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, fromLanguage: from, toLanguage: to }),
      });
      const body = (await res.json().catch(() => null)) as { translations?: string[]; error?: { message: string } } | null;
      if (!res.ok || !body?.translations) {
        toast.error(body?.error?.message ?? "Translation failed");
        return;
      }
      setOutput(JSON.stringify(Object.fromEntries(texts.map((t, i) => [t, body.translations![i]])), null, 2));
      toast.success("Translated. Review before saving into message files.");
    } catch {
      toast.error("Could not reach translation service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm text-muted-foreground">
        Translate system strings (max 20 lines). Review the result, then paste approved strings into
        <code className="mx-1 rounded bg-muted px-1">src/lib/i18n/messages/</code>
        (e.g. <code className="rounded bg-muted px-1">sw.ts</code>). Hausa system strings live in <code className="rounded bg-muted px-1">ha.ts</code> — NKENNEAi does not document Hausa yet.
      </p>
      <div className="flex flex-wrap gap-2">
        <select value={from} onChange={(e) => setFrom(e.target.value as NkenneLanguage)} className="min-h-11 rounded-xl border border-input bg-background px-2" aria-label="From">
          {NKENNE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={to} onChange={(e) => setTo(e.target.value as NkenneLanguage)} className="min-h-11 rounded-xl border border-input bg-background px-2" aria-label="To">
          {NKENNE_LANGUAGES.filter((l) => l !== from).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <Button type="button" className="min-h-11 rounded-xl font-bold" disabled={busy} onClick={run}>{busy ? "Translating…" : "Translate strings"}</Button>
      </div>
      <textarea value={source} onChange={(e) => setSource(e.target.value)} rows={6} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base" aria-label="Strings to translate, one per line" />
      {output && <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs">{output}</pre>}
    </div>
  );
}
