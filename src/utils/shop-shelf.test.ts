import { describe, expect, it } from "vitest";

import { parseShopShelf } from "./shop-shelf";

describe("parseShopShelf", () => {
  it("extracts product names and categories from shelf OCR", () => {
    const text = `
      Rice 50kg
      Beans
      Palm Oil
      Coca Cola
      Bath Soap
      Phone Charger
    `;
    const items = parseShopShelf(text);
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.some((i) => /rice/i.test(i.name) && i.category === "foodstuff")).toBe(true);
    expect(items.some((i) => /cola|coca/i.test(i.name) && i.category === "drinks")).toBe(true);
    expect(items.some((i) => /soap/i.test(i.name) && i.category === "personal_care")).toBe(true);
    expect(items.some((i) => /charger/i.test(i.name) && i.category === "electronics")).toBe(true);
  });

  it("ignores price-only and noise lines", () => {
    const items = parseShopShelf("₦1500\nTOTAL\nWelcome\nGarri");
    expect(items.some((i) => /garri/i.test(i.name))).toBe(true);
    expect(items.every((i) => !/^total$/i.test(i.name))).toBe(true);
  });

  it("dedupes similar names", () => {
    const items = parseShopShelf("Rice\nRice\nRICE");
    expect(items.filter((i) => /rice/i.test(i.name))).toHaveLength(1);
  });

  it("returns empty for blank OCR", () => {
    expect(parseShopShelf("")).toEqual([]);
  });
});
