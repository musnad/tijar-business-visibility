import { describe, expect, it } from "vitest";

import { assertProductsBelongToBusiness, requireShoppingTags } from "@/lib/feed/video-tag-guard";

describe("assertProductsBelongToBusiness", () => {
  it("rejects another shop's SKU", () => {
    const r = assertProductsBelongToBusiness("biz-1", [
      { id: "p1", business_id: "biz-1" },
      { id: "p2", business_id: "biz-2" },
    ]);
    expect(r.ok).toBe(false);
  });

  it("accepts own catalogue", () => {
    const r = assertProductsBelongToBusiness("biz-1", [{ id: "p1", business_id: "biz-1" }]);
    expect(r.ok).toBe(true);
  });
});

describe("requireShoppingTags", () => {
  it("allows a post with no product, and rejects empty ids", () => {
    expect(requireShoppingTags([]).ok).toBe(true);
    expect(requireShoppingTags(["p1"]).ok).toBe(true);
    expect(requireShoppingTags([""]).ok).toBe(false);
  });
});
