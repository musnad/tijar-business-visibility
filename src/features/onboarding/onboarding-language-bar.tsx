"use client";

import { LanguageSelect } from "@/components/site-preferences-controls";
import { useAuth } from "@/features/auth/auth-context";
import { useTranslation } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";
import { updateProfile } from "@/services/profile-service";

export function OnboardingLanguageBar() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  function onLocaleChange(next: Locale) {
    if (profile?.id) {
      void updateProfile(profile.id, { preferred_language: next });
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{t("app.onboarding.languageHint")}</p>
      <LanguageSelect compact className="shrink-0" onLocaleChange={onLocaleChange} />
    </div>
  );
}
