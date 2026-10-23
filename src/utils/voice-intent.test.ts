import { describe, expect, it } from "vitest";

import {
  parseAmount,
  parseVoiceCommand,
  parseVoiceCommandWithHint,
  summarizeDraft,
  withAmount,
} from "./voice-intent";

describe("parseAmount", () => {
  it("handles plain, comma and k amounts", () => {
    expect(parseAmount("sale 5000")).toBe(5000);
    expect(parseAmount("45,000 naira")).toBe(45000);
    expect(parseAmount("5k")).toBe(5000);
    expect(parseAmount("1.5 million")).toBe(1500000);
    expect(parseAmount("no amount")).toBeNull();
  });

  it("prefers amount after of/for", () => {
    expect(parseAmount("I made a sale of 5000")).toBe(5000);
    expect(parseAmount("sold 2 bags for 45000")).toBe(45000);
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

  it("parses I made a sale", () => {
    expect(parseVoiceCommand("I made a sale of 8000").intent).toBe("sale");
    expect(parseVoiceCommand("I made a sale of 8000").amount).toBe(8000);
    expect(parseVoiceCommand("I made a sale").intent).toBe("sale");
    expect(parseVoiceCommand("I made a sale").amount).toBeNull();
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

  it("treats sold stock as sale not purchase", () => {
    expect(parseVoiceCommand("I sold stock for 12000").intent).toBe("sale");
  });

  it("parses multilingual sale markers", () => {
    expect(parseVoiceCommand("nimeuza mchele 5000").intent).toBe("sale");
    expect(parseVoiceCommand("mo ta iresi 3000").intent).toBe("sale");
    expect(parseVoiceCommand("na sayar da shinkafa 4000").intent).toBe("sale");
    expect(parseVoiceCommand("I don sell rice 2500").intent).toBe("sale");
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
    expect(summarizeDraft(parseVoiceCommand("I made a sale"))).toMatch(/how much/i);
  });

  it("merges English translation hints", () => {
    const cmd = parseVoiceCommandWithHint("Mo ta iresi fun egbegberun marun", "I sold rice for 5000");
    expect(cmd.intent).toBe("sale");
    expect(cmd.amount).toBe(5000);
    expect(cmd.raw).toContain("Mo ta");
  });

  it("applies follow-up amount", () => {
    const draft = parseVoiceCommand("I made a sale");
    expect(withAmount(draft, 7500)).toMatchObject({ intent: "sale", amount: 7500, confidence: "high" });
  });
});
