/** True inside the TIJAR Android WebView (user-agent includes TijarApp/). */
export function isTijarNativeApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return /TijarApp\//i.test(navigator.userAgent);
}
