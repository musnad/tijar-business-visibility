"use client";

import { Moon, Sun } from "lucide-react";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/types";
import { useSitePreferences } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSelect({
  className,
  compact = false,
  onLocaleChange,
}: {
  className?: string;
  compact?: boolean;
  /** Runs after the locale is updated in site preferences. */
  onLocaleChange?: (locale: Locale) => void;
}) {
  const { locale, setLocale, t } = useSitePreferences();

  function handleChange(value: string) {
    const next = value as Locale;
    setLocale(next);
    onLocaleChange?.(next);
  }

  return (
    <div className={className}>
      <label htmlFor="site-language" className="sr-only">
        {t("nav.language")}
      </label>
      <Select value={locale} onValueChange={handleChange}>
        <SelectTrigger
          id="site-language"
          className={
            compact
              ? "h-9 w-[7.25rem] bg-background px-2 text-sm"
              : "h-10 min-w-[9.5rem] bg-background"
          }
        >
          <SelectValue placeholder={t("nav.language")} />
        </SelectTrigger>
        <SelectContent>
          {LOCALES.map((code) => (
            <SelectItem key={code} value={code}>
              {LOCALE_LABELS[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, t } = useSitePreferences();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={className}
      onClick={toggleTheme}
      aria-label={isDark ? t("nav.themeLight") : t("nav.themeDark")}
      title={isDark ? t("nav.themeLight") : t("nav.themeDark")}
    >
      {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </Button>
  );
}

export function SitePreferencesControls({
  stacked = false,
  compact = false,
}: {
  stacked?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={stacked ? "flex flex-col gap-3" : "flex flex-wrap items-center gap-2"}>
      <LanguageSelect compact={compact} className={stacked ? "w-full" : undefined} />
      <ThemeToggle className={compact ? "size-9" : undefined} />
    </div>
  );
}
