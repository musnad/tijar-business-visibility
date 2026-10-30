/** Client-side guard matching the SQL trigger: tags must be the posting shop's SKUs. */

export function assertProductsBelongToBusiness(
  businessId: string,
  products: { id: string; business_id: string }[],
): { ok: true } | { ok: false; error: string } {
  const foreign = products.find((p) => p.business_id !== businessId);
  if (foreign) {
    return { ok: false, error: "Product must belong to the same business as the video" };
  }
  return { ok: true };
}

export function requireShoppingTags(productIds: string[]): { ok: true } | { ok: false; error: string } {
  if (productIds.some((id) => !id)) {
    return { ok: false, error: "Pick a product from your shop." };
  }
  return { ok: true };
}
