import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { RequireAuth } from "@/features/app/require-auth";
import { ProfileScreen } from "@/features/profile/profile-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RequireAuth>
      <ProfilePageContent />
    </RequireAuth>
  );
}

function ProfilePageContent() {
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);

  if (!profile) return null;

  return (
    <AppShell>
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && (
        <ProfileScreen profile={profile} business={data?.business ?? null} />
      )}
    </AppShell>
  );
}
