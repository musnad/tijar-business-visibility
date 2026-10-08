import { describe, expect, it } from "vitest";

import { parseDelimitedText } from "@/features/records/parse-import-file";

describe("parseDelimitedText", () => {
  it("parses csv rows", () => {
    const csv = `date,type,amount,currency,payment_method,description
2026-01-01T10:00:00,sale,100,NGN,cash,Test sale`;
    const result = parseDelimitedText(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.amount).toBe(100);
    expect(result.rows[0]?.type).toBe("sale");
  });
});
