import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { LearnHubScreen } from "@/features/learn/learn-hub-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
export const Route = createFileRoute("/app/learn/")({
  component: AppLearnIndexPage,
});

function AppLearnIndexPage() {
  const { profile } = useAuth();
  const { data } = usePrimaryBusiness(profile?.id);

  if (!profile) return null;

  return (
    <AppShell>
      <LearnHubScreen
        profileId={profile.id}
        islamicMode={data?.business?.islamic_mode_enabled ?? false}
      />
    </AppShell>
  );
}
