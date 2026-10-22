import { nkenneTranslate, type NkenneClientConfig } from "@/lib/nkenne/client";

/**
 * Provider-independent translation interface.
 * UI and routes depend on this shape only — swapping NKENNEAi for another
 * provider means implementing this interface, not rewriting screens.
 */
export interface TranslationProvider {
  id: string;
  translate(input: { text: string; fromLanguage: string; toLanguage: string }): Promise<string>;
  /** Documented language names this provider accepts (exact strings). */
  supportedLanguages(): readonly string[];
}

export function createNkenneProvider(config: NkenneClientConfig): TranslationProvider {
  return {
    id: "nkenneai",
    translate: (input) => nkenneTranslate(config, input),
    supportedLanguages: () => ["English", "Yoruba", "Swahili", "Nigerian Pidgin"] as const,
  };
}
