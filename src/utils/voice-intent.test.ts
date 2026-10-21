import { describe, expect, it } from "vitest";

import { parseAmount, parseVoiceCommand, summarizeDraft } from "./voice-intent";

describe("parseAmount", () => {
  it("handles plain, comma and k amounts", () => {
    expect(parseAmount("sale 5000")).toBe(5000);
    expect(parseAmount("45,000 naira")).toBe(45000);
    expect(parseAmount("5k")).toBe(5000);
    expect(parseAmount("1.5 million")).toBe(1500000);
    expect(parseAmount("no amount")).toBeNull();
  });
});

describe("parseVoiceCommand", () => {
  it("parses sale commands", () => {
    const cmd = parseVoiceCommand("add record sale 5000 for rice");
    expect(cmd.intent).toBe("sale");
    expect(cmd.amount).toBe(5000);
    expect(cmd.description.toLowerCase()).toContain("rice");
    expect(cmd.confidence).toBe("high");
  });

  it("parses expense commands", () => {
    const cmd = parseVoiceCommand("record expense 2000 transport");
    expect(cmd).toMatchObject({ intent: "expense", amount: 2000 });
  });

  it("parses natural sale sentences", () => {
    const cmd = parseVoiceCommand("I sold 2 bags of rice for 45000");
    expect(cmd.intent).toBe("sale");
    expect(cmd.amount).toBe(45000);
  });

  it("parses purchases and customer payments", () => {
    expect(parseVoiceCommand("bought stock 30000").intent).toBe("purchase");
    expect(parseVoiceCommand("customer paid me 5000").intent).toBe("customer_payment");
  });

  it("unknown without intent or amount", () => {
    expect(parseVoiceCommand("hello tijar").confidence).toBe("low");
    expect(parseVoiceCommand("record sale").amount).toBeNull();
  });

  it("summarizes drafts for confirmation", () => {
    expect(summarizeDraft(parseVoiceCommand("record sale 5000 rice"))).toContain("Confirm");
    expect(summarizeDraft(parseVoiceCommand("hello"))).toContain("could not understand");
  });
});
