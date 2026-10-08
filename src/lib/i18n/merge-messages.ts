import type { MessageTree } from "./types";

export function deepMergeMessages(base: MessageTree, overlay: MessageTree): MessageTree {
  const result: MessageTree = { ...base };
  for (const key of Object.keys(overlay)) {
    const b = base[key];
    const o = overlay[key];
    if (
      o &&
      typeof o === "object" &&
      !Array.isArray(o) &&
      b &&
      typeof b === "object" &&
      !Array.isArray(b)
    ) {
      result[key] = deepMergeMessages(b as MessageTree, o as MessageTree);
    } else if (o !== undefined) {
      result[key] = o;
    }
  }
  return result;
}
