/**
 * NKENNEAi language support — verified against the official quickstart
 * (https://nkenne.ai/nkenneai-api, checked 2026-10-21).
 *
 * Documented API languages ONLY: English, Yoruba, Swahili, Nigerian Pidgin.
 * Documented pairs: English <-> each other language. Same-language and
 * direct non-English pairs (e.g. Yoruba -> Swahili) are NOT supported.
 *
 * Hausa/Igbo exist in Tijar's UI i18n and in NKENNE's broader product, but
 * are NOT documented API values — they must surface as unsupported, never
 * be sent to the API.
 */

export const NKENNE_LANGUAGES = ["English", "Yoruba", "Swahili", "Nigerian Pidgin"] as const;
export type NkenneLanguage = (typeof NKENNE_LANGUAGES)[number];

export function isNkenneLanguage(value: string): value is NkenneLanguage {
  return (NKENNE_LANGUAGES as readonly string[]).includes(value);
}

/** Tijar UI locale -> NKENNEAi language name. Null = not supported by the API. */
const LOCALE_TO_NKENNE: Record<string, NkenneLanguage | null> = {
  en: "English",
  yo: "Yoruba",
  sw: "Swahili",
  ha: null, // Hausa: not in documented API
  ig: null, // Igbo: not in documented API
  ar: null,
  ff: null,
  pcm: "Nigerian Pidgin",
};

export function nkenneLanguageForLocale(locale: string): NkenneLanguage | null {
  return LOCALE_TO_NKENNE[locale] ?? null;
}

export type PairCheck =
  | { ok: true }
  | { ok: false; code: "UNSUPPORTED_LANGUAGE" | "UNSUPPORTED_PAIR" | "SAME_LANGUAGE"; message: string };

/**
 * Translation path using only documented pairs. Direct when possible;
 * otherwise pivot via English (e.g. Yoruba -> English -> Swahili).
 * Returns null when either language is unsupported (e.g. Hausa today).
 */
export function resolveTranslationPath(from: string, to: string): string[] | null {
  if (!isNkenneLanguage(from) || !isNkenneLanguage(to) || from === to) return null;
  if (from === "English" || to === "English") return [from, to];
  return [from, "English", to];
}

export function checkLanguagePair(from: string, to: string): PairCheck {
  if (!isNkenneLanguage(from) || !isNkenneLanguage(to)) {
    const bad = !isNkenneLanguage(from) ? from : to;
    return {
      ok: false,
      code: "UNSUPPORTED_LANGUAGE",
      message: `NKENNEAi does not support "${bad}" yet. Supported: ${NKENNE_LANGUAGES.join(", ")}.`,
    };
  }
  if (from === to) {
    return { ok: false, code: "SAME_LANGUAGE", message: "Source and target language are the same." };
  }
  if (from !== "English" && to !== "English") {
    return {
      ok: false,
      code: "UNSUPPORTED_PAIR",
      message: `Direct ${from} to ${to} translation is not supported. Translate via English.`,
    };
  }
  return { ok: true };
}
