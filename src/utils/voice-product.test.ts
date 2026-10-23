import { describe, expect, it } from "vitest";

import { parseVoiceProduct } from "./voice-product";

describe("parseVoiceProduct", () => {
  it("parses goods with prices and stock", () => {
    const d = parseVoiceProduct("add product rice sell 15000 cost 12000 stock 20 bag");
    expect(d.kind).toBe("goods");
    expect(d.name.toLowerCase()).toContain("rice");
    expect(d.salePrice).toBe("15000");
    expect(d.costPrice).toBe("12000");
    expect(d.initialStock).toBe("20");
    expect(d.unit).toBe("bag");
    expect(d.confidence).toBe("high");
  });

  it("parses service", () => {
    const d = parseVoiceProduct("new service haircut for 2500");
    expect(d.kind).toBe("service");
    expect(d.name.toLowerCase()).toContain("haircut");
    expect(d.salePrice).toBe("2500");
    expect(d.unit).toBe("job");
  });

  it("handles k suffix", () => {
    const d = parseVoiceProduct("product beans sell 45k cost 38k stock 8");
    expect(d.salePrice).toBe("45000");
    expect(d.costPrice).toBe("38000");
    expect(d.initialStock).toBe("8");
  });

  it("keeps a name even without prices", () => {
    const d = parseVoiceProduct("add product palm oil");
    expect(d.name.toLowerCase()).toMatch(/palm|oil/);
    expect(d.confidence).toBe("low");
  });
});
