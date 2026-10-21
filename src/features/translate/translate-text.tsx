"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { NKENNE_LANGUAGES, nkenneLanguageForLocale, type NkenneLanguage } from "@/lib/nkenne/languages";
import { translateTextClient } from "@/services/translate-service";

/**
 * Explicit translation control: the original is always preserved and the
 * translation appears alongside it. Nothing is sent or published
 * automatically. Default target follows the user's app language.
 */
export function TranslateText({
  text,
  fromLanguage: fromProp = "English",
  label = "Translate",
  allowSourceSelect = false,
  onUseTranslation,
}: {
  text: string;
  fromLanguage?: NkenneLanguage;
  label?: string;
  allowSourceSelect?: boolean;
  /** Optional owner action ("Use this text") — always an explicit click. */
  onUseTranslation?: (translated: string) => void;
}) {
  const { locale } = useTranslation();
  const [fromLanguage, setFromLanguage] = useState<NkenneLanguage>(fromProp);
  const defaultTarget = nkenneLanguageForLocale(locale) ?? "English";
  const [target, setTarget] = useState<NkenneLanguage>(
    defaultTarget === fromProp ? "English" : defaultTarget,
  );
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "done"; translated: string; cached: boolean }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function run() {
    setState({ kind: "loading" });
    const result = await translateTextClient({ text, fromLanguage, toLanguage: target });
    if (result.ok) setState({ kind: "done", translated: result.translatedText, cached: result.cached });
    else setState({ kind: "error", message: result.message });
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        {allowSourceSelect && (
          <select
            value={fromLanguage}
            onChange={(e) => setFromLanguage(e.target.value as NkenneLanguage)}
            className="min-h-9 rounded-lg border border-input bg-background px-2 text-xs"
            aria-label="Translate from"
          >
            {NKENNE_LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        )}
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as NkenneLanguage)}
          className="min-h-9 rounded-lg border border-input bg-background px-2 text-xs"
          aria-label="Translate to"
        >
          {NKENNE_LANGUAGES.filter((l) => l !== fromLanguage).map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" className="min-h-9 rounded-lg text-xs" onClick={run} disabled={state.kind === "loading" || !text.trim()}>
          <Languages className="mr-1 size-3.5" />
          {state.kind === "loading" ? "Translating…" : label}
        </Button>
      </div>

      {state.kind === "done" && (
        <div className="mt-2 rounded-xl bg-muted/70 p-3 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {target} translation{state.cached ? " (saved copy)" : ""}
          </p>
          <p className="mt-1 leading-relaxed">{state.translated}</p>
          {onUseTranslation && (
            <Button type="button" size="sm" className="mt-2 min-h-9 rounded-lg text-xs" onClick={() => onUseTranslation(state.translated)}>
              Use this translation
            </Button>
          )}
        </div>
      )}
      {state.kind === "error" && <p className="mt-2 text-xs text-destructive">{state.message}</p>}
    </div>
  );
}
