import type { AccountMode, ActiveMode, Profile } from "@/types/database";

export function profileAccountMode(profile: Profile | null | undefined): AccountMode {
  return profile?.account_mode ?? "business";
}

export function profileActiveMode(profile: Profile | null | undefined): ActiveMode {
  const account = profileAccountMode(profile);
  const active = profile?.active_mode ?? "business";
  // Customer-only accounts stay in the marketplace until admin approval.
  if (account === "customer") return "customer";
  // Verified / registered businesses can switch Shop ↔ Business freely.
  return active === "customer" ? "customer" : "business";
}

export function isCustomerOnly(profile: Profile | null | undefined): boolean {
  return profileAccountMode(profile) === "customer";
}

export function canUseBusinessMode(profile: Profile | null | undefined): boolean {
  const mode = profileAccountMode(profile);
  return mode === "business" || mode === "both";
}

export function canUseCustomerMode(profile: Profile | null | undefined): boolean {
  const mode = profileAccountMode(profile);
  return mode === "customer" || mode === "both" || mode === "business";
}
