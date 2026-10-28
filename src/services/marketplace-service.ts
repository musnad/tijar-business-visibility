import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CartItem,
  CustomerAddress,
  MarketplaceOrder,
  MarketplaceOrderItem,
  PublicProduct,
} from "@/types/database";

const MARKETPLACE_PRODUCT_SELECT =
  "id, business_id, name, kind, description, sale_price, unit, image_url, is_available, is_informal, business_name, business_slug, business_logo_url, category_name";

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
    .eq("is_available", true)
    .order("name")
    .limit(limit);

  // Fallback before informal marketplace migration is applied.
  if (error) {
    const legacy = await supabase
      .from("public_business_products")
      .select(MARKETPLACE_PRODUCT_SELECT_LEGACY)
      .eq("is_available", true)
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
      data: (data ?? [])
        .map((p) => {
          const b = byId.get(p.business_id as string);
          return {
            ...(p as PublicProduct),
            business_name: (b?.business_name as string) ?? undefined,
            business_slug: (b?.slug as string) ?? undefined,
            is_informal: (b?.is_informal as boolean | undefined) ?? true,
          };
        })
        .filter((p) => p.is_informal !== false),
      error: null,
    };
  }

  return {
    data: ((data ?? []) as PublicProduct[]).filter((p) => p.is_informal !== false),
    error: null,
  };
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
  },
): Promise<{ error: string | null }> {
  const { cartId, error: cartError } = await getOrCreateActiveCart(profileId);
  if (cartError || !cartId) return { error: cartError ?? "Could not open cart." };

  const supabase = getSupabaseBrowserClient();
  const qty = input.quantity ?? 1;
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", input.productId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: Number(existing.quantity) + qty })
      .eq("id", existing.id);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from("cart_items").insert({
    cart_id: cartId,
    business_id: input.businessId,
    product_id: input.productId,
    quantity: qty,
    unit_price: input.unitPrice,
    product_name: input.productName,
    unit: input.unit,
    image_url: input.imageUrl ?? null,
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

export async function placeOrders(input: {
  fulfilment?: "pickup" | "seller_delivery" | "third_party";
  addressId?: string | null;
  buyerNote?: string;
  buyerPhone?: string;
}): Promise<{ orders: MarketplaceOrder[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("place_marketplace_orders", {
    p_fulfilment: input.fulfilment ?? "pickup",
    p_address_id: input.addressId ?? null,
    p_buyer_note: input.buyerNote ?? null,
    p_buyer_phone: input.buyerPhone ?? null,
  });
  if (error) return { orders: [], error: error.message };
  return { orders: (data ?? []) as MarketplaceOrder[], error: null };
}

export async function completeTestPayment(orderId: string): Promise<{
  order: MarketplaceOrder | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("complete_test_payment", { p_order_id: orderId });
  if (error) return { order: null, error: error.message };
  return { order: data as MarketplaceOrder, error: null };
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

export async function requestBusinessUpgrade(input: {
  profileId: string;
  businessName: string;
  location?: string;
  phone?: string;
  note?: string;
}): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("business_upgrade_requests").insert({
    profile_id: input.profileId,
    business_name: input.businessName.trim(),
    location: input.location?.trim() || null,
    phone: input.phone?.trim() || null,
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
