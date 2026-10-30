import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { EditProfileForm } from "@/features/profile/edit-profile-form";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/profile/edit")({
  component: EditProfilePage,
});

function EditProfilePage() {
  return (
    <RequireAuth>
      <EditProfilePageContent />
    </RequireAuth>
  );
}

function EditProfilePageContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data } = usePrimaryBusiness(profile?.id);

  if (!profile) return null;

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.profile.editTitle")}
        {...(data?.business?.business_name ? { subtitle: data.business.business_name } : {})}
        action={<BackLinkButton to="/app/profile" label={t("app.common.back")} />}
      />
      <EditProfileForm profile={profile} business={data?.business ?? null} />
    </AppShell>
  );
}
