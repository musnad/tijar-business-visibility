import { describe, expect, it } from "vitest";

import { canPublishProduct, productPublishErrors } from "./publish-guard";

describe("productPublishErrors", () => {
  it("requires name and price; photo is optional so priced items go live immediately", () => {
    expect(productPublishErrors({ name: "", sale_price: null })).toEqual(
      expect.arrayContaining(["Add a product name.", "Set a price, or keep this unpublished and take enquiries only."]),
    );
    expect(
      canPublishProduct({
        name: "Rice",
        sale_price: 1000,
        is_active: true,
      }),
    ).toBe(true);
  });
});
