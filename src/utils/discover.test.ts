import { describe, expect, it } from "vitest";

import {
  detectDuplicates,
  filterListings,
  formatDistance,
  haversineKm,
  isListingVisible,
  isValidCoordinates,
  isValidSlug,
  listingCompleteness,
  slugifyBusinessName,
  type DiscoverListing,
} from "./discover";

const KANO = { lat: 12.0022, lng: 8.592 };
const LAGOS = { lat: 6.5244, lng: 3.3792 };

function listing(overrides: Partial<DiscoverListing> = {}): DiscoverListing {
  return {
    id: Math.random().toString(36).slice(2),
    slug: "aisha-foods",
    business_name: "Aisha Foods",
    description: "Rice, beans and provisions",
    category_id: "cat-food",
    category_name: "Foodstuff",
    latitude: KANO.lat,
    longitude: KANO.lng,
    is_verified: false,
    product_names: ["Rice 50kg", "Beans"],
    ...overrides,
  };
}

describe("visibility rule", () => {
  it("requires published + approved + approved valid location + slug", () => {
    const base = {
      is_published: true,
      moderation_status: "approved",
      location_approved: true,
      latitude: 12,
      longitude: 8,
      public_slug: "aisha-foods",
    };
    expect(isListingVisible(base)).toBe(true);
    expect(isListingVisible({ ...base, is_published: false })).toBe(false);
    expect(isListingVisible({ ...base, moderation_status: "suspended" })).toBe(false);
    expect(isListingVisible({ ...base, moderation_status: "pending" })).toBe(false);
    expect(isListingVisible({ ...base, location_approved: false })).toBe(false);
    expect(isListingVisible({ ...base, latitude: null })).toBe(false);
    expect(isListingVisible({ ...base, public_slug: null })).toBe(false);
  });
});

describe("coordinates + slug", () => {
  it("rejects 0,0 and out-of-range", () => {
    expect(isValidCoordinates(0, 0)).toBe(false);
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidCoordinates(12, 8)).toBe(true);
    expect(isValidCoordinates(null, 8)).toBe(false);
  });
  it("slugifies names", () => {
    expect(slugifyBusinessName("Aisha Foods & Sons!")).toBe("aisha-foods-sons");
    expect(isValidSlug("aisha-foods")).toBe(true);
    expect(isValidSlug("Aisha Foods")).toBe(false);
  });
});

describe("geo", () => {
  it("computes Kano–Lagos distance roughly", () => {
    const d = haversineKm(KANO, LAGOS);
    expect(d).toBeGreaterThan(800);
    expect(d).toBeLessThan(950);
    expect(formatDistance(0.4)).toBe("400 m");
    expect(formatDistance(3.25)).toBe("3.3 km");
  });
});

describe("search + filters", () => {
  const items = [
    listing({ business_name: "Aisha Foods", latitude: KANO.lat, longitude: KANO.lng }),
    listing({
      business_name: "Emeka Tailoring",
      description: "Agbada and repairs",
      category_id: "cat-tailor",
      category_name: "Tailoring",
      latitude: LAGOS.lat,
      longitude: LAGOS.lng,
      is_verified: true,
      product_names: ["Agbada sewing"],
    }),
  ];

  it("searches name, category and product keywords", () => {
    expect(filterListings(items, { query: "rice" })).toHaveLength(1);
    expect(filterListings(items, { query: "agbada" })).toHaveLength(1);
    expect(filterListings(items, { query: "tailoring" })).toHaveLength(1);
    expect(filterListings(items, { query: "nonexistent" })).toHaveLength(0);
  });

  it("filters by category and verified", () => {
    expect(filterListings(items, { categoryId: "cat-tailor" })).toHaveLength(1);
    expect(filterListings(items, { verifiedOnly: true })).toHaveLength(1);
  });

  it("distance filter only applies with a centre; sorted nearest first", () => {
    const near = filterListings(items, { centre: KANO, radiusKm: 10 });
    expect(near).toHaveLength(1);
    expect(near[0]?.business_name).toBe("Aisha Foods");
    // Location denied: no centre -> everything still discoverable
    expect(filterListings(items, { centre: null, radiusKm: 10 })).toHaveLength(2);
  });
});

describe("completeness + duplicates", () => {
  it("reports missing pieces", () => {
    const r = listingCompleteness({ business_name: "Aisha Foods" });
    expect(r.score).toBeLessThan(50);
    expect(r.missing).toContain("map location");
  });

  it("flags same name nearby and same phone", () => {
    const dupes = detectDuplicates([
      { id: "1", business_name: "Aisha Foods", latitude: 12.0, longitude: 8.59, public_phone: "0803" },
      { id: "2", business_name: "aisha foods", latitude: 12.001, longitude: 8.591, public_phone: "0803" },
      { id: "3", business_name: "Other Shop", latitude: 6.5, longitude: 3.37, public_phone: "0809" },
    ]);
    expect(dupes.has("1")).toBe(true);
    expect(dupes.has("3")).toBe(false);
  });
});
