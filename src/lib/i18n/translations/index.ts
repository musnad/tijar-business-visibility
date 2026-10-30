import type { Locale, MessageTree } from "../types";

import arRaw from "./ar.json?raw";
import ffRaw from "./ff.json?raw";
import haRaw from "./ha.json?raw";
import igRaw from "./ig.json?raw";
import swRaw from "./sw.json?raw";
import yoRaw from "./yo.json?raw";

function parseFlat(raw: string): Record<string, string> {
  return JSON.parse(raw) as Record<string, string>;
}

/**
 * Full-coverage translations, stored flat ("app.sales.title": "...") so
 * completeness can be machine-verified against the English source:
 * every key in en.json must exist here for switching language to
 * translate the whole app, not only selected screens.
 */
const FLAT_BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  ha: parseFlat(haRaw),
  ar: parseFlat(arRaw),
  yo: parseFlat(yoRaw),
  ig: parseFlat(igRaw),
  sw: parseFlat(swRaw),
  ff: parseFlat(ffRaw),
};

function flatToTree(flat: Record<string, string>): MessageTree {
  const root: MessageTree = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let node: MessageTree = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i]!;
      const next = node[part];
      if (typeof next === "object" && next !== null) {
        node = next;
      } else {
        const created: MessageTree = {};
        node[part] = created;
        node = created;
      }
    }
    node[parts[parts.length - 1]!] = value;
  }
  return root;
}

const treeCache = new Map<Locale, MessageTree>();

export function getFullTranslationOverlay(locale: Locale): MessageTree {
  if (locale === "en") return {};
  const cached = treeCache.get(locale);
  if (cached) return cached;
  const flat = FLAT_BY_LOCALE[locale];
  const tree = flat ? flatToTree(flat) : {};
  treeCache.set(locale, tree);
  return tree;
}
