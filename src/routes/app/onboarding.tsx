import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { RequireAuth } from "@/features/app/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const Route = createFileRoute("/app/onboarding")({
  component: AppOnboardingPage,
});

function AppOnboardingPage() {
  return (
    <RequireAuth requireOnboardingComplete={false}>
      <OnboardingGate />
    </RequireAuth>
  );
}

function OnboardingGate() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.onboarding_status === "completed") {
      void navigate({ to: "/app" });
    }
  }, [profile?.onboarding_status, navigate]);

  if (profile?.onboarding_status === "completed") {
    return null;
  }

  return <OnboardingWizard />;
}
