import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CheckoutQuote } from "@/lib/checkout/quote";
import { isLivePaymentConfigured } from "@/lib/payments/adapter";
import type {
  CartItem,
  CustomerAddress,
  MarketplaceOrder,
  MarketplaceOrderItem,
  NotificationPreferences,
  PublicBusiness,
  PublicProduct,
} from "@/types/database";
import { haversineKm } from "@/utils/discover";

export type NearbyMarketplaceShop = PublicBusiness & {
  distance_km: number;
  products: PublicProduct[];
};

export type MarketplaceShop = PublicBusiness & {
  product_count: number;
  product_names: string[];
};

const MARKETPLACE_SHOP_SELECT =
  "id, slug, business_name, description, location_text, public_location_label, latitude, longitude, logo_url, cover_image_url, category_id, category_name, public_phone, public_whatsapp, opening_hours, is_verified, verification_status, is_informal";

const MARKETPLACE_PRODUCT_SELECT =
  "id, business_id, name, kind, description, sale_price, unit, image_url, extra_image_urls, video_url, attributes, variants, currency, is_available, created_at, updated_at, is_informal, business_name, business_slug, business_logo_url, category_name";

const MARKETPLACE_PRODUCT_SELECT_LEGACY =
  "id, business_id, name, kind, description, sale_price, unit, image_url, is_available";

export async function fetchMarketplaceProducts(limit = 120): Promise<{
  data: PublicProduct[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  let { data, error } = await supabase
    .from("public_business_products")
    .select(MARKETPLACE_PRODUCT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error && /created_at/i.test(error.message)) {
    const retry = await supabase
      .from("public_business_products")
      .select(MARKETPLACE_PRODUCT_SELECT)
      .order("name")
      .limit(limit);
    data = retry.data;
    error = retry.error;
  }

  // Fallback before informal marketplace migration is applied.
  if (error) {
    const legacy = await supabase
      .from("public_business_products")
      .select(MARKETPLACE_PRODUCT_SELECT_LEGACY)
      .order("name")
      .limit(limit);
    if (legacy.error) return { data: [], error: legacy.error.message };
    data = legacy.data;
    error = null;

    const { data: listings } = await supabase
      .from("public_business_listings")
      .select("id, slug, business_name, is_informal")
      .limit(400);
    const byId = new Map((listings ?? []).map((b) => [b.id as string, b]));
    return {
      data: (data ?? []).map((p) => {
        const b = byId.get(p.business_id as string);
        return {
          ...(p as PublicProduct),
          business_name: (b?.business_name as string) ?? undefined,
          business_slug: (b?.slug as string) ?? undefined,
          is_informal: (b?.is_informal as boolean | undefined) ?? true,
        };
      }),
      error: null,
    };
  }

  return {
    data: (data ?? []) as PublicProduct[],
    error: null,
  };
}

/** Published informal businesses for marketplace landing — includes shops without products. */
export async function fetchMarketplaceShops(limit = 200): Promise<{
  shops: MarketplaceShop[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  let { data, error } = await supabase
    .from("public_marketplace_businesses")
    .select(MARKETPLACE_SHOP_SELECT)
    .order("business_name")
    .limit(limit);

  if (error) {
    const fallback = await supabase
      .from("public_business_listings")
      .select(MARKETPLACE_SHOP_SELECT)
      .order("business_name")
      .limit(limit);
    if (fallback.error) {
      const legacy = await supabase
        .from("public_business_listings")
        .select(
          "id, slug, business_name, description, location_text, public_location_label, latitude, longitude, logo_url, category_id, category_name, public_phone, public_whatsapp, opening_hours, is_verified, verification_status",
        )
        .order("business_name")
        .limit(limit);
      if (legacy.error) return { shops: [], error: legacy.error.message };
      data = legacy.data;
    } else {
      data = fallback.data;
    }
    error = null;
  }

  const rows = (data ?? []) as PublicBusiness[];
  const { data: productRows } = await supabase
    .from("public_business_products")
    .select("business_id, name")
    .limit(2000);

  const namesByBiz = new Map<string, string[]>();
  for (const row of productRows ?? []) {
    const list = namesByBiz.get(row.business_id as string) ?? [];
    list.push(row.name as string);
    namesByBiz.set(row.business_id as string, list);
  }

  return {
    shops: rows.map((b) => {
      const names = namesByBiz.get(b.id) ?? [];
      return { ...b, product_names: names, product_count: names.length };
    }),
    error: null,
  };
}

/** Informal shops with products near a map centre — for purchase discovery. */
export async function fetchNearbyMarketplaceShops(input: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}): Promise<{ shops: NearbyMarketplaceShop[]; error: string | null }> {
  const radiusKm = input.radiusKm ?? 25;
  const centre = { lat: input.lat, lng: input.lng };

  const [productsRes, listingsRes] = await Promise.all([
    fetchMarketplaceProducts(200),
    (async () => {
      const supabase = getSupabaseBrowserClient();
      return supabase
        .from("public_business_listings")
        .select(
          "id, slug, business_name, description, location_text, public_location_label, latitude, longitude, logo_url, category_id, category_name, public_phone, public_whatsapp, opening_hours, is_verified, verification_status, is_informal",
        )
        .limit(400);
    })(),
  ]);

  if (productsRes.error) return { shops: [], error: productsRes.error };
  if (listingsRes.error) return { shops: [], error: listingsRes.error.message };

  const productsByBiz = new Map<string, PublicProduct[]>();
  for (const p of productsRes.data) {
    const list = productsByBiz.get(p.business_id) ?? [];
    list.push(p);
    productsByBiz.set(p.business_id, list);
  }

  const shops: NearbyMarketplaceShop[] = [];
  for (const row of listingsRes.data ?? []) {
    const listing = row as PublicBusiness;
    if (listing.is_informal === false) continue;
    if (!productsByBiz.has(listing.id)) continue;
    if (typeof listing.latitude !== "number" || typeof listing.longitude !== "number") continue;
    const distance_km = haversineKm(centre, {
      lat: listing.latitude,
      lng: listing.longitude,
    });
    if (distance_km > radiusKm) continue;
    shops.push({
      ...listing,
      distance_km,
      products: productsByBiz.get(listing.id) ?? [],
    });
  }

  shops.sort((a, b) => a.distance_km - b.distance_km);
  return { shops: shops.slice(0, input.limit ?? 40), error: null };
}

export async function fetchMarketplaceProduct(productId: string): Promise<{
  product: PublicProduct | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  let { data, error } = await supabase
    .from("public_business_products")
    .select(MARKETPLACE_PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    const legacy = await supabase
      .from("public_business_products")
      .select(MARKETPLACE_PRODUCT_SELECT_LEGACY)
      .eq("id", productId)
      .maybeSingle();
    if (legacy.error) return { product: null, error: legacy.error.message };
    data = legacy.data;
    error = null;
  }

  if (error) return { product: null, error: error.message };
  if (!data) return { product: null, error: null };

  const product = data as PublicProduct;
  if (product.is_informal === false) {
    return { product: null, error: "This product is not available on the informal marketplace." };
  }

  if (!product.business_name || !product.business_slug) {
    const { data: listing } = await supabase
      .from("public_business_listings")
      .select("id, slug, business_name, is_informal")
      .eq("id", product.business_id)
      .maybeSingle();
    if (listing?.is_informal === false) {
      return { product: null, error: "This product is not available on the informal marketplace." };
    }
    return {
      product: {
        ...product,
        business_name: (listing?.business_name as string) ?? product.business_name,
        business_slug: (listing?.slug as string) ?? product.business_slug,
        is_informal: (listing?.is_informal as boolean | undefined) ?? product.is_informal ?? true,
      },
      error: null,
    };
  }

  return { product, error: null };
}

async function getOrCreateActiveCart(profileId: string): Promise<{ cartId: string | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();
  if (existing?.id) return { cartId: existing.id as string, error: null };

  const { data, error } = await supabase
    .from("carts")
    .insert({ profile_id: profileId, status: "active" })
    .select("id")
    .single();
  if (error) return { cartId: null, error: error.message };
  return { cartId: data.id as string, error: null };
}

export async function fetchCart(profileId: string): Promise<{
  items: CartItem[];
  error: string | null;
}> {
  const { cartId, error: cartError } = await getOrCreateActiveCart(profileId);
  if (cartError || !cartId) return { items: [], error: cartError };
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", cartId)
    .order("created_at");
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []) as CartItem[], error: null };
}

export async function addToCart(
  profileId: string,
  input: {
    businessId: string;
    productId: string;
    productName: string;
    unit: string;
    unitPrice: number;
    quantity?: number;
    imageUrl?: string | null;
    variantId?: string | null;
    variantLabel?: string | null;
  },
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const qty = input.quantity ?? 1;
  const rpc = await supabase.rpc("add_marketplace_cart_item", {
    p_product_id: input.productId,
    p_quantity: qty,
    p_variant_id: input.variantId ?? null,
  });
  if (!rpc.error) return { error: null };

  const { cartId, error: cartError } = await getOrCreateActiveCart(profileId);
  if (cartError || !cartId) return { error: cartError ?? "Could not open cart." };

  const live = await fetchMarketplaceProduct(input.productId);
  if (live.error) return { error: live.error };
  if (!live.product?.is_available) return { error: "This product is not available." };
  if (live.product.sale_price == null) return { error: "This listing has no price — send an enquiry instead." };

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", input.productId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("cart_items")
      .update({
        quantity: Number(existing.quantity) + qty,
        unit_price: Number(live.product.sale_price),
        product_name: live.product.name,
      })
      .eq("id", existing.id);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from("cart_items").insert({
    cart_id: cartId,
    business_id: live.product.business_id,
    product_id: input.productId,
    quantity: qty,
    unit_price: Number(live.product.sale_price),
    product_name: live.product.name,
    unit: live.product.unit,
    image_url: live.product.image_url ?? null,
    variant_id: input.variantId ?? null,
    variant_label: input.variantLabel ?? null,
  });
  return { error: error?.message ?? null };
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  if (quantity <= 0) {
    const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
  return { error: error?.message ?? null };
}

export async function removeCartItem(itemId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
  return { error: error?.message ?? null };
}

export async function quoteCheckout(
  fulfilment: "pickup" | "seller_delivery" | "third_party",
): Promise<{ quote: CheckoutQuote | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("quote_marketplace_checkout", {
    p_fulfilment: fulfilment,
  });
  if (error) return { quote: null, error: error.message };
  return { quote: data as CheckoutQuote, error: null };
}

export async function placeOrders(input: {
  fulfilment?: "pickup" | "seller_delivery" | "third_party";
  addressId?: string | null;
  buyerNote?: string;
  buyerPhone?: string;
  idempotencyKey: string;
}): Promise<{ orders: MarketplaceOrder[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const payload = {
    p_fulfilment: input.fulfilment ?? "pickup",
    p_address_id: input.addressId ?? null,
    p_buyer_note: input.buyerNote ?? null,
    p_buyer_phone: input.buyerPhone ?? null,
    p_idempotency_key: input.idempotencyKey,
  };
  let { data, error } = await supabase.rpc("place_marketplace_orders", payload);
  if (error && /p_idempotency_key|function.*place_marketplace_orders/i.test(error.message)) {
    const legacy = await supabase.rpc("place_marketplace_orders", {
      p_fulfilment: payload.p_fulfilment,
      p_address_id: payload.p_address_id,
      p_buyer_note: payload.p_buyer_note,
      p_buyer_phone: payload.p_buyer_phone,
    });
    data = legacy.data;
    error = legacy.error;
  }
  if (error) return { orders: [], error: error.message };
  return { orders: (data ?? []) as MarketplaceOrder[], error: null };
}

export async function transitionOrder(
  orderId: string,
  nextStatus: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("transition_marketplace_order", {
    p_order_id: orderId,
    p_new_status: nextStatus,
  });
  return { error: error?.message ?? null };
}

/** Kept for older screens. Always refuses to mark paid from the client. */
export async function completeTestPayment(_orderId: string): Promise<{
  order: MarketplaceOrder | null;
  error: string | null;
}> {
  if (!isLivePaymentConfigured()) {
    return {
      order: null,
      error: "Payment is not live. This stays an order request until Paystack or Flutterwave is connected.",
    };
  }
  return { order: null, error: "Use the payment webhook — the app cannot mark an order paid." };
}

export async function fetchMyOrders(): Promise<{ orders: MarketplaceOrder[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { orders: [], error: error.message };
  return { orders: (data ?? []) as MarketplaceOrder[], error: null };
}

export async function fetchOrderDetail(orderId: string): Promise<{
  order: MarketplaceOrder | null;
  items: MarketplaceOrderItem[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) return { order: null, items: [], error: error.message };
  if (!order) return { order: null, items: [], error: null };
  const { data: items, error: iErr } = await supabase.from("order_items").select("*").eq("order_id", orderId);
  if (iErr) return { order: order as MarketplaceOrder, items: [], error: iErr.message };
  return { order: order as MarketplaceOrder, items: (items ?? []) as MarketplaceOrderItem[], error: null };
}

export async function listAddresses(profileId: string): Promise<{
  data: CustomerAddress[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("profile_id", profileId)
    .order("is_default", { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CustomerAddress[], error: null };
}

export async function saveAddress(
  profileId: string,
  input: Omit<CustomerAddress, "id" | "profile_id"> & { id?: string },
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const row = {
    profile_id: profileId,
    label: input.label,
    full_name: input.full_name,
    phone: input.phone,
    state: input.state,
    city: input.city,
    lga: input.lga,
    street: input.street,
    instructions: input.instructions,
    is_default: input.is_default,
  };
  if (input.id) {
    const { error } = await supabase.from("customer_addresses").update(row).eq("id", input.id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("customer_addresses").insert(row);
  return { error: error?.message ?? null };
}

export async function toggleFavoriteProduct(
  profileId: string,
  productId: string,
): Promise<{ favorited: boolean; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data: existing } = await supabase
    .from("marketplace_favorites")
    .select("id")
    .eq("profile_id", profileId)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from("marketplace_favorites").delete().eq("id", existing.id);
    return { favorited: false, error: error?.message ?? null };
  }
  const { error } = await supabase.from("marketplace_favorites").insert({
    profile_id: profileId,
    product_id: productId,
  });
  return { favorited: true, error: error?.message ?? null };
}

export async function fetchFavoriteProducts(profileId: string): Promise<{
  products: PublicProduct[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data: favs, error } = await supabase
    .from("marketplace_favorites")
    .select("product_id")
    .eq("profile_id", profileId)
    .not("product_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return { products: [], error: error.message };
  const ids = (favs ?? []).map((f) => f.product_id as string).filter(Boolean);
  if (ids.length === 0) return { products: [], error: null };

  const catalog = await fetchMarketplaceProducts(200);
  if (catalog.error) return { products: [], error: catalog.error };
  const byId = new Map(catalog.data.map((p) => [p.id, p]));
  return {
    products: ids.map((id) => byId.get(id)).filter((p): p is PublicProduct => Boolean(p)),
    error: null,
  };
}

export async function countFavoriteProducts(profileId: string): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { count } = await supabase
    .from("marketplace_favorites")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .not("product_id", "is", null);
  return count ?? 0;
}

export type BusinessUpgradeRequest = {
  id: string;
  profile_id: string;
  business_name: string;
  location: string | null;
  phone: string | null;
  note: string | null;
  description: string | null;
  category_id: string | null;
  shop_image_url: string | null;
  whatsapp: string | null;
  state: string | null;
  city: string | null;
  street: string | null;
  latitude: number | null;
  longitude: number | null;
  public_location_label: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function fetchMyBusinessUpgradeRequest(profileId: string): Promise<{
  request: BusinessUpgradeRequest | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("business_upgrade_requests")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { request: null, error: error.message };
  return { request: (data as BusinessUpgradeRequest | null) ?? null, error: null };
}

export async function uploadUpgradeShopImage(
  profileId: string,
  file: File,
): Promise<{ publicUrl: string | null; error: string | null }> {
  if (!file.type.startsWith("image/")) {
    return { publicUrl: null, error: "Use a JPG, PNG, WEBP, or GIF photo." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { publicUrl: null, error: "Photo is too large. Use an image under 5 MB." };
  }
  const supabase = getSupabaseBrowserClient();
  const extRaw = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(extRaw)
    ? extRaw === "jpeg"
      ? "jpg"
      : extRaw
    : "jpg";
  const path = `${profileId}/shop.${ext}`;
  const { error } = await supabase.storage.from("upgrade-shop-images").upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
  });
  if (error) {
    if (error.message.toLowerCase().includes("bucket not found")) {
      return {
        publicUrl: null,
        error: "Shop image storage is not set up yet. Apply migration 000015 in Supabase.",
      };
    }
    return { publicUrl: null, error: error.message };
  }
  const { data } = supabase.storage.from("upgrade-shop-images").getPublicUrl(path);
  return { publicUrl: data.publicUrl, error: null };
}

export async function requestBusinessUpgrade(input: {
  profileId: string;
  businessName: string;
  description: string;
  categoryId: string;
  location: string;
  street: string;
  city: string;
  state: string;
  phone: string;
  whatsapp?: string;
  shopImageUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  publicLocationLabel?: string;
  note?: string;
}): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("business_upgrade_requests").insert({
    profile_id: input.profileId,
    business_name: input.businessName.trim(),
    description: input.description.trim(),
    category_id: input.categoryId,
    location: input.location.trim(),
    street: input.street.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    phone: input.phone.trim(),
    whatsapp: input.whatsapp?.trim() || null,
    shop_image_url: input.shopImageUrl,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    public_location_label: input.publicLocationLabel?.trim() || null,
    note: input.note?.trim() || null,
    status: "pending",
  });
  return { error: error?.message ?? null };
}

export async function setActiveMode(
  profileId: string,
  mode: "customer" | "business",
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("profiles").update({ active_mode: mode }).eq("id", profileId);
  return { error: error?.message ?? null };
}

export async function reportListing(input: {
  reporterId: string;
  businessId: string;
  reason: "spam" | "scam" | "hate" | "wrong_info" | "other";
  details?: string;
}): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("listing_reports").insert({
    reporter_id: input.reporterId,
    business_id: input.businessId,
    reason: input.reason,
    details: input.details?.trim() || null,
  });
  if (error?.code === "23505") return { error: "You already reported this shop." };
  return { error: error?.message ?? null };
}

export async function fetchMyEnquiries(profileId: string): Promise<{
  enquiries: Array<{
    id: string;
    business_id: string;
    message: string;
    created_at: string;
    customer_name: string;
  }>;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("business_enquiries")
    .select("id, business_id, message, created_at, customer_name")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return { enquiries: [], error: error.message };
  return { enquiries: data ?? [], error: null };
}

export async function fetchFollowedBusinesses(profileId: string): Promise<{
  shops: PublicBusiness[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data: follows, error } = await supabase
    .from("business_follows")
    .select("business_id")
    .eq("profile_id", profileId);
  if (error) return { shops: [], error: error.message };
  const ids = (follows ?? []).map((f) => f.business_id as string);
  if (ids.length === 0) return { shops: [], error: null };
  const { data, error: listError } = await supabase
    .from("public_business_listings")
    .select(MARKETPLACE_SHOP_SELECT)
    .in("id", ids);
  if (listError) return { shops: [], error: listError.message };
  return { shops: (data ?? []) as PublicBusiness[], error: null };
}

export async function fetchNotificationPreferences(profileId: string): Promise<{
  prefs: NotificationPreferences;
  error: string | null;
}> {
  const fallback: NotificationPreferences = {
    profile_id: profileId,
    order_updates: true,
    enquiry_replies: true,
    followed_shops: true,
    marketing: false,
  };
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) return { prefs: fallback, error: error.message };
  return { prefs: (data as NotificationPreferences | null) ?? fallback, error: null };
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    ...prefs,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message ?? null };
}
