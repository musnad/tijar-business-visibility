import { describe, expect, it } from "vitest";

import { sellerOverview, type SellerVideoRow } from "./seller-dashboard-service";
import type { Business, Product } from "@/types/database";

const business = {
  business_name: "Ada Market",
  description: "Food stall",
  public_slug: "ada-market",
  latitude: 6.5,
  longitude: 3.3,
  location_approved: true,
  public_phone: "0800",
  public_whatsapp: "0800",
  logo_url: "https://example.com/logo.png",
} as Business;

function product(partial: Partial<Product>): Product {
  return {
    id: partial.id ?? "p1",
    business_id: "b1",
    name: "Rice",
    kind: "goods",
    unit: "bag",
    sale_price: 1000,
    cost_price: 800,
    stock_quantity: 2,
    low_stock_threshold: 1,
    notes: null,
    image_url: "https://example.com/p.jpg",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    is_active: true,
    is_published: true,
    ...partial,
  } as Product;
}

describe("sellerOverview", () => {
  it("counts published, draft, and archived catalogue items without inventing videos", () => {
    const videos: SellerVideoRow[] = [];
    const overview = sellerOverview({
      business,
      products: [
        product({ id: "1", is_published: true }),
        product({ id: "2", is_published: false }),
        product({ id: "3", is_active: false, is_published: false }),
      ],
      videos,
    });
    expect(overview.publishedProducts).toBe(1);
    expect(overview.draftProducts).toBe(1);
    expect(overview.archivedProducts).toBe(1);
    expect(overview.completeness.score).toBeGreaterThan(0);
  });
});
