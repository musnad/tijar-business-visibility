import { describe, expect, it } from "vitest";

import { extractContactsFromFreeText, parseContactCsv } from "./extract-contacts";

describe("parseContactCsv", () => {
  it("reads name, email and phone columns", () => {
    const rows = parseContactCsv(`name,email,phone
Ada Okonkwo,ada@example.com,08012345678
Bello Musa,bello@tijar.ng,+2349012345678`);
    expect(rows).toEqual([
      { name: "Ada Okonkwo", email: "ada@example.com", phone: "08012345678" },
      { name: "Bello Musa", email: "bello@tijar.ng", phone: "+2349012345678" },
    ]);
  });

  it("skips rows with no contact channel", () => {
    expect(parseContactCsv("name,email\nGhost,").length).toBe(0);
  });
});

describe("extractContactsFromFreeText", () => {
  it("pulls emails and phones from a messy PDF-like dump", () => {
    const rows = extractContactsFromFreeText("Contact ada@example.com or 08012345678 for class.");
    expect(rows.some((r) => r.email === "ada@example.com")).toBe(true);
    expect(rows.some((r) => r.phone === "08012345678")).toBe(true);
  });
});
