import { describe, expect, it } from "vitest";

import { messages } from "./messages";
import { resolveMessage } from "./resolve";
import type { Locale, MessageTree } from "./types";

function flatten(tree: MessageTree, prefix = "", out = new Set<string>()): Set<string> {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.add(path);
    else flatten(value, path, out);
  }
  return out;
}

const englishKeys = [...flatten(messages.en)];
const locales: Locale[] = ["ha", "ar", "yo", "ig", "sw", "ff"];

describe("full language coverage", () => {
  it("English source has strings to translate", () => {
    expect(englishKeys.length).toBeGreaterThan(1000);
  });

  for (const locale of locales) {
    it(`every English string exists in ${locale}`, () => {
      const missing = englishKeys.filter((key) => resolveMessage(messages[locale], key) === undefined);
      expect(missing).toEqual([]);
    });
  }
});
