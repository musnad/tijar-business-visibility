export type ProductVariant = {
  id: string;
  label: string;
  size?: string;
  colour?: string;
  price_delta: number;
  stock?: number;
};

export function parseVariantList(raw: unknown): ProductVariant[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductVariant[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.trim() : "";
    const label = typeof r.label === "string" ? r.label.trim() : "";
    if (!id || !label) continue;
    const price_delta = Number(r.price_delta ?? 0);
    out.push({
      id,
      label,
      size: typeof r.size === "string" ? r.size : undefined,
      colour: typeof r.colour === "string" ? r.colour : undefined,
      price_delta: Number.isFinite(price_delta) ? price_delta : 0,
      stock: typeof r.stock === "number" ? r.stock : undefined,
    });
  }
  return out;
}

export function variantsFromSizeColour(sizesRaw: string, coloursRaw: string): ProductVariant[] {
  const sizes = sizesRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const colours = coloursRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const sizeList = sizes.length ? sizes : [""];
  const colourList = colours.length ? colours : [""];
  if (!sizes.length && !colours.length) return [];
  const out: ProductVariant[] = [];
  for (const size of sizeList) {
    for (const colour of colourList) {
      const parts = [colour, size].filter(Boolean);
      const label = parts.join(" / ");
      out.push({
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label,
        size: size || undefined,
        colour: colour || undefined,
        price_delta: 0,
      });
    }
  }
  return out;
}

export function parseAttributes(size?: string, colour?: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (size?.trim()) attributes.size = size.trim();
  if (colour?.trim()) attributes.colour = colour.trim();
  return attributes;
}
