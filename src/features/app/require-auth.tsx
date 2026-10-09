"use client";

import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { SupabaseSetupNotice } from "@/features/auth/supabase-setup-notice";
import { resolveAppEntry } from "@/features/auth/route-guards";

export function RequireAuth({
  children,
  requireOnboardingComplete = true,
}: {
  children: ReactNode;
  requireOnboardingComplete?: boolean;
}) {
  const { loading, session, profile, configured } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!configured) return;

    const authed = Boolean(session);
    if (!authed) {
      void navigate({ to: "/login" });
      return;
    }

    if (requireOnboardingComplete && profile?.onboarding_status !== "completed") {
      void navigate({ to: "/app/onboarding" });
    }
  }, [loading, session, profile, configured, requireOnboardingComplete, navigate]);

  if (!configured) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <SupabaseSetupNotice />
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        …
      </div>
    );
  }

  if (requireOnboardingComplete && profile?.onboarding_status !== "completed") {
    return null;
  }

  return children;
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { loading, session, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !session) return;
    const target = resolveAppEntry(profile, true);
    if (target !== "/app/login") {
      void navigate({ to: target });
    }
  }, [loading, session, profile, navigate]);

  if (loading) return null;
  if (session) return null;

  return children;
}
