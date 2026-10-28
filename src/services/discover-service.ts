import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Business, BusinessEnquiry, PublicBusiness, PublicProduct } from "@/types/database";

const LISTING_COLUMNS =
  "id, slug, business_name, description, location_text, public_location_label, latitude, longitude, logo_url, category_id, category_name, public_phone, public_whatsapp, opening_hours, is_verified, verification_status";

/** All published listings (bounded; client filters/sorts). Falls back gracefully pre-migration. */
export async function fetchPublishedBusinesses(limit = 200): Promise<{
  data: PublicBusiness[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("public_business_listings")
    .select(LISTING_COLUMNS)
    .order("business_name")
    .limit(limit);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as PublicBusiness[], error: null };
}

/** PostGIS-backed nearby search (geography index). Used when a centre is known. */
export async function fetchNearbyBusinesses(input: {
  lat: number;
  lng: number;
  radiusKm: number;
  categoryId?: string | null;
  query?: string;
}): Promise<{ data: PublicBusiness[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("nearby_businesses", {
    p_lat: input.lat,
    p_lng: input.lng,
    p_radius_km: input.radiusKm,
    p_category_id: input.categoryId ?? null,
    p_query: input.query?.trim() ? input.query.trim() : null,
    p_limit: 100,
  });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as PublicBusiness[], error: null };
}

export async function fetchStorefront(slug: string): Promise<{
  business: PublicBusiness | null;
  products: PublicProduct[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("public_business_listings")
    .select(LISTING_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) return { business: null, products: [], error: error.message };
  if (!data) return { business: null, products: [], error: null };

  const business = data as PublicBusiness;
  const { data: products, error: pError } = await supabase
    .from("public_business_products")
    .select("id, business_id, name, kind, description, sale_price, unit, image_url, is_available")
    .eq("business_id", business.id)
    .order("name");
  if (pError) return { business, products: [], error: pError.message };
  return { business, products: (products ?? []) as PublicProduct[], error: null };
}

/** Product names per business, for keyword search ("rice", "agbada"). */
export async function fetchListingProductNames(): Promise<Map<string, string[]>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase
    .from("public_business_products")
    .select("business_id, name")
    .limit(1000);
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.business_id as string) ?? [];
    list.push(row.name as string);
    map.set(row.business_id as string, list);
  }
  return map;
}

export async function submitEnquiry(input: {
  businessId: string;
  customerName: string;
  customerPhone?: string;
  message: string;
}): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("business_enquiries").insert({
    business_id: input.businessId,
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone?.trim() || null,
    message: input.message.trim(),
  });
  return { error: error?.message ?? null };
}

export async function fetchBusinessEnquiries(
  businessId: string,
): Promise<{ data: BusinessEnquiry[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("business_enquiries")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as BusinessEnquiry[], error: null };
}

// ---------------------------------------------------------------------------
// Owner publishing
// ---------------------------------------------------------------------------

export type UpdateListingInput = {
  publicSlug: string;
  isPublished: boolean;
  publicPhone?: string;
  publicWhatsapp?: string;
  openingHours: Record<string, string>;
  latitude: number | null;
  longitude: number | null;
  publicLocationLabel?: string;
  locationApproved: boolean;
  /** When true, products appear on TIJAR Marketplace (informal sellers only). */
  isInformal?: boolean;
};

export async function updateBusinessListing(
  businessId: string,
  input: UpdateListingInput,
): Promise<{ business: Business | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const patch: Record<string, unknown> = {
    public_slug: input.publicSlug.trim() || null,
    is_published: input.isPublished,
    public_phone: input.publicPhone?.trim() || null,
    public_whatsapp: input.publicWhatsapp?.trim() || null,
    opening_hours: input.openingHours,
    latitude: input.latitude,
    longitude: input.longitude,
    public_location_label: input.publicLocationLabel?.trim() || null,
    location_approved: input.locationApproved,
    published_at: input.isPublished ? new Date().toISOString() : null,
  };
  if (typeof input.isInformal === "boolean") {
    patch.is_informal = input.isInformal;
  }
  const { data, error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("id", businessId)
    .select("*")
    .single();
  if (error) return { business: null, error: error.message };
  return { business: data as Business, error: null };
}

export async function isSlugAvailable(slug: string, exceptBusinessId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("public_slug", slug)
    .neq("id", exceptBusinessId)
    .limit(1);
  return (data ?? []).length === 0;
}

// ---------------------------------------------------------------------------
// Admin moderation (RLS restricts these to platform admins)
// ---------------------------------------------------------------------------

export async function fetchListingsForModeration(): Promise<{
  data: Business[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return { data: [], error: error.message };
  // Non-admins only see their own businesses via RLS; the screen checks role separately.
  return { data: (data ?? []) as Business[], error: null };
}

export async function setListingModeration(
  businessId: string,
  status: Business["moderation_status"],
  notes?: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("businesses")
    .update({ moderation_status: status, moderation_notes: notes?.trim() || null })
    .eq("id", businessId);
  return { error: error?.message ?? null };
}

export async function fetchMyPlatformRoles(profileId: string): Promise<string[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase
    .from("platform_roles")
    .select("role")
    .eq("profile_id", profileId);
  return (data ?? []).map((r) => r.role as string);
}
