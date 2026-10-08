import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { ProfileSettingsScreen } from "@/features/profile/profile-settings-screen";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/profile/settings")({
  component: ProfileSettingsPage,
});

function ProfileSettingsPage() {
  return (
    <RequireAuth>
      <ProfileSettingsPageContent />
    </RequireAuth>
  );
}

function ProfileSettingsPageContent() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.profile.settingsTitle")}
        action={<BackLinkButton to="/app/profile" label={t("app.common.back")} />}
      />
      <ProfileSettingsScreen />
    </AppShell>
  );
}
