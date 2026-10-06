"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { messages } from "./messages";
import { resolveMessage } from "./resolve";
import { isLocale, type Locale, type ThemeMode } from "./types";

const LOCALE_STORAGE_KEY = "tijar-locale";
const THEME_STORAGE_KEY = "tijar-theme";

type SitePreferencesContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  t: (key: string) => string;
};

const SitePreferencesContext = createContext<SitePreferencesContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored && isLocale(stored) ? stored : "en";
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function SitePreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setThemeState(readStoredTheme());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [locale, theme]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const t = useCallback(
    (key: string) => {
      const localized = resolveMessage(messages[locale], key);
      if (localized) return localized;
      const fallback = resolveMessage(messages.en, key);
      return fallback ?? key;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, theme, setTheme, toggleTheme, t }),
    [locale, setLocale, theme, setTheme, toggleTheme, t],
  );

  return (
    <SitePreferencesContext.Provider value={value}>{children}</SitePreferencesContext.Provider>
  );
}

export function useSitePreferences() {
  const context = useContext(SitePreferencesContext);
  if (!context) {
    throw new Error("useSitePreferences must be used within SitePreferencesProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, locale } = useSitePreferences();
  return { t, locale };
}
