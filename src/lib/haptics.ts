/** Web stand-in for native haptic feedback. No-ops where Vibration is blocked. */
export function haptic(kind: "light" | "success" | "warning" = "light"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (kind === "success") navigator.vibrate([8, 20, 12]);
  else if (kind === "warning") navigator.vibrate([16, 30, 16]);
  else navigator.vibrate(10);
}
