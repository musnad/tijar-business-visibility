import type { AccountMode, ActiveMode, Profile } from "@/types/database";

export function profileAccountMode(profile: Profile | null | undefined): AccountMode {
  return profile?.account_mode ?? "business";
}

export function profileActiveMode(profile: Profile | null | undefined): ActiveMode {
  const account = profileAccountMode(profile);
  const active = profile?.active_mode ?? "business";
  if (account === "customer") return "customer";
  if (account === "business") return "business";
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
