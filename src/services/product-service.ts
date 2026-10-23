import type { ProductFormInput, StockAdjustInput } from "@/features/products/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Product, ProductKind, StockMovementReason } from "@/types/database";

export async function listProducts(businessId: string): Promise<{
  data: Product[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("name");

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Product[], error: null };
}

export async function getProduct(productId: string): Promise<{
  product: Product | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  if (error) return { product: null, error: error.message };
  return { product: (data as Product) ?? null, error: null };
}

export async function updateProductImageUrl(
  productId: string,
  imageUrl: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("products").update({ image_url: imageUrl }).eq("id", productId);
  return { error: error?.message ?? null };
}

function mapProductError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("rls")) {
    return "You do not have permission to add products for this business. Sign in again.";
  }
  if (m.includes("products_name_not_empty") || m.includes("name")) {
    return "Enter a product name.";
  }
  if (m.includes("insufficient stock")) {
    return "Stock change is not allowed (would go below zero).";
  }
  if (m.includes("column") && m.includes("kind")) {
    return "Database needs the products update. Ask your admin to run the latest Supabase migrations.";
  }
  return message;
}

export async function createProduct(
  businessId: string,
  profileId: string,
  input: ProductFormInput,
): Promise<{ product: Product | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const kind = (input.kind ?? "goods") as ProductKind;
  const name = input.name.trim();
  if (name.length < 1) return { product: null, error: "Enter a product name." };

  const payload = {
    business_id: businessId,
    name,
    kind,
    unit: kind === "service" ? "job" : input.unit?.trim() || "piece",
    sale_price: input.salePrice ?? null,
    cost_price: input.costPrice ?? null,
    stock_quantity: 0,
    low_stock_threshold: kind === "service" ? 0 : (input.lowStockThreshold ?? 5),
    notes: input.notes?.trim() || null,
  };

  let { data, error } = await supabase.from("products").insert(payload).select("*").single();

  // Older DBs without `kind` — retry without that column so add still works.
  if (error && /kind/i.test(error.message)) {
    const { kind: _kind, ...withoutKind } = payload;
    const retry = await supabase.from("products").insert(withoutKind).select("*").single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return { product: null, error: mapProductError(error.message) };
  const product = data as Product;

  if (kind === "goods" && input.initialStock && input.initialStock > 0) {
    const moveErr = await recordStockMovement(
      businessId,
      profileId,
      product.id,
      input.initialStock,
      "initial",
      "Opening stock",
    );
    if (moveErr) {
      // Product exists; stock can be fixed later — don't lose the product.
      return {
        product,
        error: `Product saved, but opening stock failed: ${mapProductError(moveErr)}`,
      };
    }
    const refreshed = await getProduct(product.id);
    return { product: refreshed.product ?? product, error: null };
  }

  return { product, error: null };
}

export async function recordStockMovement(
  businessId: string,
  profileId: string,
  productId: string,
  quantityDelta: number,
  reason: StockMovementReason,
  notes?: string,
  transactionId?: string,
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("stock_movements").insert({
    business_id: businessId,
    product_id: productId,
    quantity_delta: quantityDelta,
    reason,
    notes: notes?.trim() || null,
    created_by: profileId,
    transaction_id: transactionId ?? null,
  });
  return error?.message ?? null;
}

export async function adjustStock(
  businessId: string,
  profileId: string,
  productId: string,
  input: StockAdjustInput,
): Promise<{ error: string | null }> {
  const delta = input.direction === "in" ? input.quantity : -input.quantity;
  const err = await recordStockMovement(
    businessId,
    profileId,
    productId,
    delta,
    input.reason,
    input.notes,
  );
  return { error: err };
}

export async function deactivateProduct(productId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("products").update({ is_active: false }).eq("id", productId);
  return { error: error?.message ?? null };
}
