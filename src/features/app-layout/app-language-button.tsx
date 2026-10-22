"use client";

import { useEffect, useRef } from "react";
import { Check, Globe } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-context";
import { useSitePreferences } from "@/lib/i18n/context";
import { messages } from "@/lib/i18n/messages";
import { resolveMessage } from "@/lib/i18n/resolve";
import { LOCALE_LABELS, LOCALES, isLocale, type Locale } from "@/lib/i18n/types";
import { updateProfile } from "@/services/profile-service";

/** Confirmation said in the language just selected (falls back to English). */
function changedMessage(locale: Locale): string {
  return (
    resolveMessage(messages[locale], "app.layout.languageChanged") ??
    resolveMessage(messages.en, "app.layout.languageChanged") ??
    "Language changed"
  );
}

/**
 * Globe button in the app top bar (beside notifications). Switching changes
 * the whole app language immediately, is remembered on this device, and is
 * saved to the user's profile so it follows them across devices.
 */
export function AppLanguageButton() {
  const { locale, setLocale, t } = useSitePreferences();
  const { profile, refreshProfile } = useAuth();
  const syncedProfileId = useRef<string | null>(null);

  // On first profile load, adopt the language saved on the account.
  useEffect(() => {
    if (!profile?.id || syncedProfileId.current === profile.id) return;
    syncedProfileId.current = profile.id;
    const saved = profile.preferred_language;
    if (saved && isLocale(saved) && saved !== locale) {
      setLocale(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  function choose(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    toast.success(`${changedMessage(next)} · ${LOCALE_LABELS[next]}`);
    if (profile?.id) {
      void updateProfile(profile.id, { preferred_language: next })
        .then(() => refreshProfile())
        .catch(() => {
          /* Device preference already saved; profile sync can retry later. */
        });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
          aria-label={t("app.layout.language")}
          title={t("app.layout.language")}
        >
          <Globe className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t("app.layout.language")}</DropdownMenuLabel>
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => choose(code)}
            className="flex items-center justify-between gap-2 py-2.5"
          >
            <span className={code === locale ? "font-bold text-primary" : "font-medium"}>
              {LOCALE_LABELS[code]}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">{code}</span>
              {code === locale ? <Check className="size-4 text-primary" aria-hidden /> : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
