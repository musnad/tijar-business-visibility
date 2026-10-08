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

export async function createProduct(
  businessId: string,
  profileId: string,
  input: ProductFormInput,
): Promise<{ product: Product | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const kind = (input.kind ?? "goods") as ProductKind;
  const { data, error } = await supabase
    .from("products")
    .insert({
      business_id: businessId,
      name: input.name.trim(),
      kind,
      unit: kind === "service" ? "job" : input.unit?.trim() || "piece",
      sale_price: input.salePrice ?? null,
      cost_price: input.costPrice ?? null,
      stock_quantity: 0,
      low_stock_threshold: kind === "service" ? 0 : (input.lowStockThreshold ?? 5),
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return { product: null, error: error.message };
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
    if (moveErr) return { product: null, error: moveErr };
    const refreshed = await getProduct(product.id);
    return { product: refreshed.product, error: null };
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
