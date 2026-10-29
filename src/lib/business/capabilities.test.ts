import { describe, expect, it } from "vitest";

import { hasCapability, METRIC_DEFINITIONS } from "./capabilities";

describe("hasCapability", () => {
  it("gives owners every capability", () => {
    expect(hasCapability("owner", {}, "manage_staff")).toBe(true);
    expect(hasCapability("owner", { manage_products: false }, "manage_products")).toBe(true);
  });

  it("defaults staff to catalogue work but not staff admin", () => {
    expect(hasCapability("staff", {}, "manage_products")).toBe(true);
    expect(hasCapability("staff", {}, "manage_staff")).toBe(false);
    expect(hasCapability("staff", { publish_videos: false }, "publish_videos")).toBe(false);
  });

  it("documents metric definitions without treating them as live results", () => {
    expect(METRIC_DEFINITIONS.qualified_views).toMatch(/Deduplicated/);
    expect(METRIC_DEFINITIONS.attributed_orders).toMatch(/Correlation/);
  });
});
