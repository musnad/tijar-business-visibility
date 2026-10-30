import { MOCK_BUSINESS_ID } from "@/features/marketplace/feed-mock";
import type { CartItem } from "@/types/database";

const key = (profileId: string | null | undefined) => `tijar-local-cart-${profileId?.trim() || "guest"}`;
const seededKey = (profileId: string | null | undefined) => `tijar-local-cart-seeded-v2-${profileId?.trim() || "guest"}`;

function read(profileId: string | null | undefined): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(profileId: string | null | undefined, items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(profileId), JSON.stringify(items));
}

export function demoCartItems(): CartItem[] {
  return [
    {
      id: "local-cart-handbag",
      cart_id: "local",
      business_id: MOCK_BUSINESS_ID,
      product_id: "mock-leather-handbag",
      quantity: 1,
      unit_price: 45_000,
      product_name: "Leather Handbag",
      unit: "piece",
      image_url: "/tessy-leather-handbag.jpg",
      variant_label: "Brown / Medium",
    },
    {
      id: "local-cart-sneakers",
      cart_id: "local",
      business_id: MOCK_BUSINESS_ID,
      product_id: "mock-street-sneakers",
      quantity: 1,
      unit_price: 28_500,
      product_name: "White Sneakers",
      unit: "pair",
      image_url: "/mock-sneakers.jpg",
      variant_label: "42 / White",
    },
    {
      id: "local-cart-sunglasses",
      cart_id: "local",
      business_id: MOCK_BUSINESS_ID,
      product_id: "mock-sunglasses",
      quantity: 1,
      unit_price: 17_000,
      product_name: "Sunglasses",
      unit: "pair",
      image_url: "/mock-sunglasses.svg",
      variant_label: "Black / Polarized",
    },
  ];
}

export function listLocalCart(profileId: string | null | undefined): CartItem[] {
  const items = read(profileId);
  if (typeof window === "undefined") return items;
  if (!localStorage.getItem(seededKey(profileId))) {
    const seed = items.length > 0 ? items : demoCartItems();
    write(profileId, seed);
    localStorage.setItem(seededKey(profileId), "1");
    return seed;
  }
  return items;
}

export function addLocalCartItem(
  profileId: string | null | undefined,
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
): CartItem[] {
  const qty = input.quantity ?? 1;
  const items = listLocalCart(profileId);
  const match = items.find(
    (i) => i.product_id === input.productId && (i.variant_id ?? "") === (input.variantId ?? ""),
  );
  let next: CartItem[];
  if (match) {
    next = items.map((i) => (i.id === match.id ? { ...i, quantity: Number(i.quantity) + qty, unit_price: input.unitPrice } : i));
  } else {
    next = [
      {
        id: `local-cart-${crypto.randomUUID()}`,
        cart_id: "local",
        business_id: input.businessId,
        product_id: input.productId,
        quantity: qty,
        unit_price: input.unitPrice,
        product_name: input.productName,
        unit: input.unit,
        image_url: input.imageUrl ?? null,
        variant_id: input.variantId ?? null,
        variant_label: input.variantLabel ?? null,
      },
      ...items,
    ];
  }
  write(profileId, next);
  return next;
}

export function updateLocalCartQuantity(itemId: string, quantity: number, profileId: string | null | undefined): CartItem[] {
  const items = listLocalCart(profileId);
  const next = quantity <= 0 ? items.filter((i) => i.id !== itemId) : items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
  write(profileId, next);
  return next;
}

export function removeLocalCartItem(itemId: string, profileId: string | null | undefined): CartItem[] {
  const next = listLocalCart(profileId).filter((i) => i.id !== itemId);
  write(profileId, next);
  return next;
}

export function isLocalCartId(id: string): boolean {
  return id.startsWith("local-cart-");
}

export function clearLocalCart(profileId: string | null | undefined) {
  write(profileId, []);
  if (typeof window !== "undefined") localStorage.setItem(seededKey(profileId), "1");
}
