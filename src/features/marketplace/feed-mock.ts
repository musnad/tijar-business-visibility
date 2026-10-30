/** Leftover localStorage IDs from older demo seeds. Never treat as catalogue. */
export function isMockFeedId(id: string | null | undefined): boolean {
  return Boolean(id && (id.startsWith("mock-") || id.startsWith("mock-chat-") || id.startsWith("local-cart-handbag")));
}
