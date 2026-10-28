import { canUseBusinessMode, isCustomerOnly, profileActiveMode } from "@/lib/account-mode";
import type { Profile } from "@/types/database";

export function resolveAppEntry(profile: Profile | null, isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return "/login" as const;
  }
  if (!profile) {
    return "/login" as const;
  }

  // Customer-only accounts go straight to the marketplace.
  if (isCustomerOnly(profile) || profileActiveMode(profile) === "customer") {
    return "/shop" as const;
  }

  if (profile.onboarding_status !== "completed") {
    return "/app/onboarding" as const;
  }

  if (canUseBusinessMode(profile) && profileActiveMode(profile) === "business") {
    return "/app" as const;
  }

  return "/shop" as const;
}
