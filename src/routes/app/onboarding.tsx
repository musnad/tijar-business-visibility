import { Outlet, createFileRoute, useChildMatches, useNavigate } from "@tanstack/react-router";
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
  // Child routes (e.g. /app/onboarding/voice) must render via <Outlet />.
  // Without this, "Use your voice" changes the URL but keeps showing the typed wizard.
  const childMatches = useChildMatches();

  useEffect(() => {
    if (profile?.onboarding_status === "completed") {
      void navigate({ to: "/app" });
    }
  }, [profile?.onboarding_status, navigate]);

  if (profile?.onboarding_status === "completed") {
    return null;
  }

  if (childMatches.length > 0) {
    return <Outlet />;
  }

  return <OnboardingWizard />;
}
