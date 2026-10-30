import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function isBlankShopName(name?: string | null): boolean {
  const n = name?.trim() ?? "";
  return !n || /^tijar(\s+shop)?$/i.test(n);
}

export function displayShopName(name?: string | null): string {
  if (isBlankShopName(name)) return "Shop";
  return name!.trim();
}

export type ShopNameRow = {
  id: string;
  business_name: string;
  slug?: string | null;
  logo_url?: string | null;
  is_verified?: boolean;
  verification_status?: string | null;
  category_id?: string | null;
  category_name?: string | null;
};

export async function lookupShopProfiles(ids: string[]): Promise<Map<string, ShopNameRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, ShopNameRow>();
  if (unique.length === 0) return map;

  const supabase = getSupabaseBrowserClient();
  const publicRows = await supabase
    .from("public_marketplace_businesses")
    .select("id, slug, business_name, logo_url, is_verified, verification_status, category_id, category_name")
    .in("id", unique);
  for (const row of publicRows.data ?? []) {
    if (isBlankShopName(row.business_name as string)) continue;
    map.set(row.id as string, {
      id: row.id as string,
      business_name: row.business_name as string,
      slug: (row.slug as string | null) ?? null,
      logo_url: (row.logo_url as string | null) ?? null,
      is_verified: Boolean(row.is_verified),
      verification_status: (row.verification_status as string | null) ?? null,
      category_id: (row.category_id as string | null) ?? null,
      category_name: (row.category_name as string | null) ?? null,
    });
  }

  const missing = unique.filter((id) => !map.has(id));
  if (missing.length === 0) return map;

  const listings = await supabase
    .from("public_business_listings")
    .select("id, slug, business_name, logo_url, is_verified, verification_status, category_id, category_name")
    .in("id", missing);
  for (const row of listings.data ?? []) {
    if (isBlankShopName(row.business_name as string)) continue;
    map.set(row.id as string, {
      id: row.id as string,
      business_name: row.business_name as string,
      slug: (row.slug as string | null) ?? null,
      logo_url: (row.logo_url as string | null) ?? null,
      is_verified: Boolean(row.is_verified),
      verification_status: (row.verification_status as string | null) ?? null,
      category_id: (row.category_id as string | null) ?? null,
      category_name: (row.category_name as string | null) ?? null,
    });
  }

  const still = unique.filter((id) => !map.has(id));
  if (still.length === 0) return map;

  const owned = await supabase.from("businesses").select("id, public_slug, business_name, logo_url, verification_status, category_id").in("id", still);
  for (const row of owned.data ?? []) {
    if (isBlankShopName(row.business_name as string)) continue;
    map.set(row.id as string, {
      id: row.id as string,
      business_name: row.business_name as string,
      slug: (row.public_slug as string | null) ?? null,
      logo_url: (row.logo_url as string | null) ?? null,
      verification_status: (row.verification_status as string | null) ?? null,
      category_id: (row.category_id as string | null) ?? null,
    });
  }

  return map;
}
