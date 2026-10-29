export type PublishableProduct = {
  name: string;
  description?: string | null;
  sale_price: number | null;
  image_url?: string | null;
  is_active?: boolean;
  kind?: string;
};

export function productPublishErrors(p: PublishableProduct): string[] {
  const errors: string[] = [];
  if (!p.name.trim()) errors.push("Add a product name.");
  if (p.name.trim().length > 120) errors.push("Name must be 120 characters or fewer.");
  if (p.sale_price == null) errors.push("Set a price, or keep this unpublished and take enquiries only.");
  if (p.sale_price != null && p.sale_price < 0) errors.push("Price cannot be negative.");
  if (p.is_active === false) errors.push("Archived products cannot be published.");
  return errors;
}

export function productPublishWarnings(p: PublishableProduct): string[] {
  const warnings: string[] = [];
  if (!p.image_url) warnings.push("A photo helps shoppers. The listing still goes live with a price.");
  return warnings;
}

export function canPublishProduct(p: PublishableProduct): boolean {
  return productPublishErrors(p).length === 0;
}
