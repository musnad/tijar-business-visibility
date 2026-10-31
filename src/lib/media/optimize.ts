/** Resize/WebP via Supabase image render when the URL is a public storage object. */
export function optimizedImageUrl(url: string | null | undefined, width = 720): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/";
    if (!parsed.pathname.includes(marker)) return url;
    parsed.pathname = parsed.pathname.replace(marker, "/storage/v1/render/image/public/");
    parsed.searchParams.set("width", String(width));
    parsed.searchParams.set("quality", "72");
    parsed.searchParams.set("format", "webp");
    return parsed.toString();
  } catch {
    return url;
  }
}
