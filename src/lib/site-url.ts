/** Public origin of this TIJAR deployment (set in hosting build env). */
export function getConfiguredSiteOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_APP_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().replace(/\/$/, "");
  }
  return "";
}

/** Best origin for auth redirects and absolute links (browser or configured production URL). */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getConfiguredSiteOrigin();
}

export function absoluteAppUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = getSiteOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}
