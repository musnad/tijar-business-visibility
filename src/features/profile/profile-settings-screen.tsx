"use client";

import { Link } from "@tanstack/react-router";
import { ChevronRight, FileSpreadsheet, LogOut, Mail, Monitor, Shield, User } from "lucide-react";
import { toast } from "sonner";

import { LanguageSelect, ThemeToggle } from "@/components/site-preferences-controls";
import { Button } from "@/components/ui/button";
import {
  sendPasswordReset,
  signOut,
  signOutAllDevices,
  userHasPasswordLogin,
} from "@/features/auth/auth-service";
import { useAuth } from "@/features/auth/auth-context";
import { ChangePasswordForm } from "@/features/profile/change-password-form";
import { DeleteAccountDialog } from "@/features/profile/delete-account-dialog";
import { SettingsSection } from "@/features/profile/settings-section";
import { useTranslation } from "@/lib/i18n/context";
import { updateProfile } from "@/services/profile-service";
import type { Locale } from "@/lib/i18n/types";

export function ProfileSettingsScreen() {
  const { t } = useTranslation();
  const { profile, user, refreshProfile } = useAuth();
  const email = profile?.email ?? user?.email ?? "";
  const passwordLogin = userHasPasswordLogin(user);

  function onLocaleChange(next: Locale) {
    if (profile?.id) {
      void updateProfile(profile.id, { preferred_language: next }).then(() => refreshProfile());
    }
  }

  async function sendResetLink() {
    if (!email) {
      toast.error(t("app.profile.settings.noEmail"));
      return;
    }
    const { error } = await sendPasswordReset(email);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("app.profile.settings.resetSent"));
  }

  async function signOutEverywhere() {
    const { error } = await signOutAllDevices();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("app.profile.settings.signedOutEverywhere"));
    window.location.assign("/app/login");
  }

  return (
    <div className="mt-2 space-y-4 pb-8">
      <SettingsSection title={t("app.profile.settings.accountTitle")} hint={t("app.profile.settings.accountHint")}>
        <Link
          to="/app/profile/edit"
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3 transition-colors hover:bg-muted/40"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("app.profile.editTitle")}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.full_name}</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        {email && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{email}</span>
          </p>
        )}
      </SettingsSection>

      <SettingsSection title={t("app.records.title")} hint={t("app.records.settingsHint")}>
        <Link
          to="/app/records"
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3 transition-colors hover:bg-muted/40"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("app.records.openHub")}</p>
            <p className="text-xs text-muted-foreground">{t("app.records.subtitle")}</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      </SettingsSection>

      <SettingsSection title={t("app.profile.settings.preferencesTitle")} hint={t("app.profile.languageHint")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LanguageSelect onLocaleChange={onLocaleChange} />
          <div className="flex items-center gap-2">
            <Monitor className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-xs font-semibold text-muted-foreground">{t("app.profile.settings.theme")}</span>
            <ThemeToggle />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("app.profile.settings.securityTitle")}
        hint={t("app.profile.settings.securityHint")}
      >
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-primary/[0.06] p-3">
          <Shield className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">{t("app.profile.settings.securityBlurb")}</p>
        </div>

        {passwordLogin ? (
          <ChangePasswordForm email={email} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("app.profile.settings.oauthPassword")}</p>
        )}

        {passwordLogin && email && (
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11 w-full rounded-xl font-semibold"
            onClick={() => void sendResetLink()}
          >
            {t("app.profile.settings.sendResetLink")}
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          className="mt-3 min-h-11 w-full rounded-xl font-semibold"
          onClick={() => void signOutEverywhere()}
        >
          {t("app.profile.settings.signOutAll")}
        </Button>
      </SettingsSection>

      <SettingsSection title={t("app.profile.settings.sessionTitle")}>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full rounded-xl font-bold"
          onClick={() => void signOut().then(() => window.location.assign("/app/login"))}
        >
          <LogOut className="mr-2 size-4" />
          {t("app.common.signOut")}
        </Button>
      </SettingsSection>

      <SettingsSection
        title={t("app.profile.settings.dangerTitle")}
        hint={t("app.profile.settings.dangerHint")}
        variant="danger"
      >
        <DeleteAccountDialog />
      </SettingsSection>
    </div>
  );
}
