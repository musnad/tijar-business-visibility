import { describe, expect, it } from "vitest";

import { parseScannedDocument } from "./scan-document";

describe("parseScannedDocument", () => {
  it("parses handwritten sale style text", () => {
    const d = parseScannedDocument("Record sale 5000 for rice");
    expect(d.intent).toBe("sale");
    expect(d.amount).toBe(5000);
    expect(d.description.toLowerCase()).toContain("rice");
    expect(d.source).toBe("intent");
  });

  it("parses receipt TOTAL as sale by default", () => {
    const d = parseScannedDocument(`ABC Shop\nRice 2 bags\nTOTAL: 12,500`);
    expect(d.intent).toBe("sale");
    expect(d.amount).toBe(12500);
    expect(d.source).toBe("total");
  });

  it("parses expense notes", () => {
    const d = parseScannedDocument("Expense transport 2000");
    expect(d.intent).toBe("expense");
    expect(d.amount).toBe(2000);
  });

  it("parses amount with naira symbol", () => {
    const d = parseScannedDocument("Amount paid ₦8,000\nCustomer: walk-in");
    expect(d.amount).toBe(8000);
    expect(d.intent).toBe("sale");
  });

  it("returns low confidence when empty or unclear", () => {
    expect(parseScannedDocument("").source).toBe("none");
    expect(parseScannedDocument("hello shop").amount).toBeNull();
  });
});
