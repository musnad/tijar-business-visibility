import type { MessageTree } from "./types";

export function resolveMessage(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let current: string | MessageTree | undefined = tree;

  for (const part of parts) {
    if (current == null || typeof current === "string") return undefined;
    current = current[part];
  }

  return typeof current === "string" ? current : undefined;
}
