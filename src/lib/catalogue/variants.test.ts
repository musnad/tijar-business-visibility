import { describe, expect, it } from "vitest";

import { parseAttributes, parseVariantList, variantsFromSizeColour } from "./variants";

describe("variantsFromSizeColour", () => {
  it("builds size and colour combinations", () => {
    const v = variantsFromSizeColour("S, M", "Red, Blue");
    expect(v.map((x) => x.label)).toEqual(["Red / S", "Blue / S", "Red / M", "Blue / M"]);
    expect(parseVariantList(v)).toHaveLength(4);
  });
});

describe("parseAttributes", () => {
  it("keeps only filled fields", () => {
    expect(parseAttributes("L", "Black")).toEqual({ size: "L", colour: "Black" });
    expect(parseAttributes("  ", "")).toEqual({});
  });
});
