import type { Profile } from "@/types/database";

export function resolveAppEntry(profile: Profile | null, isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return "/app/login" as const;
  }
  if (!profile || profile.onboarding_status !== "completed") {
    return "/app/onboarding" as const;
  }
  return "/app" as const;
}
