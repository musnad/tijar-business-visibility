const RECOVERY_KEY = "tijar-password-recovery";

export function markPasswordRecovery() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(RECOVERY_KEY, "1");
}

export function clearPasswordRecovery() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(RECOVERY_KEY);
}

export function isPasswordRecovery(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(RECOVERY_KEY) === "1";
}

export function readOAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  const next = window.sessionStorage.getItem("tijar-oauth-next");
  window.sessionStorage.removeItem("tijar-oauth-next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function readGoogleAccountMode(): "customer" | "business" | null {
  if (typeof window === "undefined") return null;
  const mode = window.sessionStorage.getItem("tijar-google-account-mode");
  window.sessionStorage.removeItem("tijar-google-account-mode");
  if (mode === "customer" || mode === "business") return mode;
  return null;
}
