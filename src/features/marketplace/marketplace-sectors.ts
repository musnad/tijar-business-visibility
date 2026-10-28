import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Car,
  Cpu,
  Hammer,
  HandHelping,
  HeartPulse,
  Home,
  Paintbrush,
  Phone,
  Scissors,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Wrench,
} from "lucide-react";

import type { PublicProduct } from "@/types/database";

export type MarketplaceSector = {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Soft brand tint for the sector tile (CSS color). */
  tint: string;
  words: string[];
};

/** Informal TIJAR sectors — traders, artisans, micro-shops. */
export const MARKETPLACE_SECTORS: MarketplaceSector[] = [
  {
    key: "food",
    label: "Food & market",
    hint: "Groceries, snacks, drinks",
    icon: ShoppingBasket,
    tint: "oklch(0.94 0.04 145)",
    words: ["food", "rice", "oil", "spice", "snack", "drink", "garri", "beans", "flour", "meat", "fish", "pepper", "tomato", "bread", "egg", "milk", "provision"],
  },
  {
    key: "fresh",
    label: "Fresh produce",
    hint: "Fruits & vegetables",
    icon: Apple,
    tint: "oklch(0.94 0.05 130)",
    words: ["fruit", "vegetable", "onion", "potato", "banana", "orange", "leaf", "fresh", "produce", "yam"],
  },
  {
    key: "fashion",
    label: "Fashion",
    hint: "Clothes, fabric, shoes",
    icon: Shirt,
    tint: "oklch(0.94 0.04 20)",
    words: ["cloth", "dress", "shirt", "fashion", "shoe", "abaya", "hijab", "fabric", "wear", "ankara", "lace", "tailor", "trousers", "cap"],
  },
  {
    key: "beauty",
    label: "Beauty",
    hint: "Hair, cream, perfume",
    icon: Sparkles,
    tint: "oklch(0.95 0.04 350)",
    words: ["beauty", "cream", "soap", "perfume", "hair", "cosmetic", "lotion", "makeup", "nail", "braid"],
  },
  {
    key: "phones",
    label: "Phones",
    hint: "Handsets & accessories",
    icon: Phone,
    tint: "oklch(0.94 0.03 230)",
    words: ["phone", "mobile", "sim", "earpiece", "power bank", "case", "charger", "screen", "android", "iphone"],
  },
  {
    key: "electronics",
    label: "Electronics",
    hint: "Gadgets & appliances",
    icon: Cpu,
    tint: "oklch(0.94 0.03 250)",
    words: ["electronic", "gadget", "cable", "laptop", "radio", "tv", "fan", "generator", "inverter", "fridge", "speaker"],
  },
  {
    key: "home",
    label: "Home & kitchen",
    hint: "Pots, plastics, living",
    icon: Home,
    tint: "oklch(0.95 0.03 80)",
    words: ["home", "kitchen", "pot", "plate", "furniture", "bucket", "mat", "curtain", "plastic", "stove", "cooler"],
  },
  {
    key: "farm",
    label: "Farm & agro",
    hint: "Seeds, feed, livestock",
    icon: Sprout,
    tint: "oklch(0.94 0.05 140)",
    words: ["farm", "seed", "fertilizer", "feed", "poultry", "crop", "livestock", "agro", "chick", "maize"],
  },
  {
    key: "building",
    label: "Building",
    hint: "Hardware & materials",
    icon: Hammer,
    tint: "oklch(0.94 0.03 60)",
    words: ["building", "cement", "nail", "paint", "pipe", "timber", "hardware", "block", "iron", "plumbing"],
  },
  {
    key: "auto",
    label: "Auto & bike",
    hint: "Parts & spare",
    icon: Car,
    tint: "oklch(0.94 0.03 40)",
    words: ["auto", "car", "bike", "spare", "tyre", "oil filter", "battery", "motor", "okada", "engine"],
  },
  {
    key: "repairs",
    label: "Repairs",
    hint: "Fix & maintenance",
    icon: Wrench,
    tint: "oklch(0.94 0.03 200)",
    words: ["repair", "fix", "mechanic", "electrician", "plumber", "service", "install", "maintenance"],
  },
  {
    key: "tailoring",
    label: "Tailoring",
    hint: "Sew & alter",
    icon: Scissors,
    tint: "oklch(0.95 0.04 330)",
    words: ["tailor", "sew", "stitch", "alter", "embroidery", "sewing"],
  },
  {
    key: "crafts",
    label: "Crafts",
    hint: "Handmade & art",
    icon: Paintbrush,
    tint: "oklch(0.95 0.04 30)",
    words: ["craft", "handmade", "art", "bead", "leather", "bag", "souvenir", "woodwork"],
  },
  {
    key: "health",
    label: "Health",
    hint: "Care & wellness",
    icon: HeartPulse,
    tint: "oklch(0.95 0.04 10)",
    words: ["health", "medicine", "pharmacy", "herbal", "vitamin", "first aid", "clinic"],
  },
  {
    key: "services",
    label: "Local services",
    hint: "Help near you",
    icon: HandHelping,
    tint: "oklch(0.94 0.03 175)",
    words: ["service", "laundry", "delivery", "cleaning", "transport", "logistics", "errand"],
  },
];

export function matchesSector(product: PublicProduct, key: string): boolean {
  const sector = MARKETPLACE_SECTORS.find((s) => s.key === key);
  if (!sector) return true;
  const hay = `${product.name} ${product.description ?? ""} ${product.category_name ?? ""} ${product.kind}`.toLowerCase();
  if ((key === "services" || key === "repairs" || key === "tailoring") && product.kind === "service") {
    if (key === "services") return true;
    return sector.words.some((w) => hay.includes(w)) || product.kind === "service";
  }
  return sector.words.some((w) => hay.includes(w));
}

export function resolveProductSector(product: PublicProduct): MarketplaceSector | null {
  for (const sector of MARKETPLACE_SECTORS) {
    if (matchesSector(product, sector.key)) return sector;
  }
  return null;
}

export function countBySector(products: PublicProduct[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const sector of MARKETPLACE_SECTORS) counts.set(sector.key, 0);
  for (const product of products) {
    const sector = resolveProductSector(product);
    if (sector) counts.set(sector.key, (counts.get(sector.key) ?? 0) + 1);
  }
  return counts;
}
