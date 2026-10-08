export const LOCALES = ["en", "ha", "ar", "yo", "ig", "sw", "ff"] as const;

export type Locale = (typeof LOCALES)[number];

export type ThemeMode = "light" | "dark";

export type MessageTree = {
  [key: string]: string | MessageTree;
};

export type LocaleLabels = Record<Locale, string>;

export const LOCALE_LABELS: LocaleLabels = {
  en: "English",
  ha: "Hausa",
  ar: "العربية",
  yo: "Yorùbá",
  ig: "Igbo",
  sw: "Kiswahili",
  ff: "Fulfulde (Fulani)",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
