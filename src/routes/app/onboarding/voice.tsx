import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { VoiceOnboardingScreen } from "@/features/onboarding/voice-onboarding-screen";

export const Route = createFileRoute("/app/onboarding/voice")({
  component: VoiceOnboardingPage,
});

function VoiceOnboardingPage() {
  return (
    <RequireAuth requireOnboardingComplete={false}>
      <VoiceGate />
    </RequireAuth>
  );
}

function VoiceGate() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.onboarding_status === "completed") {
      void navigate({ to: "/app" });
    }
  }, [profile?.onboarding_status, navigate]);

  if (profile?.onboarding_status === "completed") return null;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-3 sm:px-5">
      <AppPageHeader title="Talk to TIJAR" action={<BackLinkButton to="/app/onboarding" label="Type instead" />} />
      <VoiceOnboardingScreen />
    </div>
  );
}
