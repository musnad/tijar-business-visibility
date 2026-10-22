import type { Locale, MessageTree } from "../types";

import arJson from "./ar.json";
import ffJson from "./ff.json";
import haJson from "./ha.json";
import igJson from "./ig.json";
import swJson from "./sw.json";
import yoJson from "./yo.json";

/**
 * Full-coverage translations, stored flat ("app.sales.title": "...") so
 * completeness can be machine-verified against the English source:
 * every key in en.json must exist here for switching language to
 * translate the whole app, not only selected screens.
 */
const FLAT_BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  ha: haJson as Record<string, string>,
  ar: arJson as Record<string, string>,
  yo: yoJson as Record<string, string>,
  ig: igJson as Record<string, string>,
  sw: swJson as Record<string, string>,
  ff: ffJson as Record<string, string>,
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
