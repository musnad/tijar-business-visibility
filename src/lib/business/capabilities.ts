export type BusinessCapability =
  | "manage_products"
  | "publish_videos"
  | "view_analytics"
  | "manage_orders"
  | "manage_staff";

export type MemberRole = "owner" | "staff";

export function hasCapability(
  role: MemberRole | null | undefined,
  permissions: Record<string, boolean> | null | undefined,
  cap: BusinessCapability,
): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  if (cap === "manage_staff") return Boolean(permissions?.manage_staff);
  if (permissions && cap in permissions) return Boolean(permissions[cap]);
  return cap !== "manage_staff";
}

export const METRIC_DEFINITIONS = {
  impressions: "Times a video started loading in a shopper feed (not a unique person count).",
  qualified_views: "Deduplicated views recorded for a signed-in shopper on a video (one view row per person per video).",
  likes: "Heart taps stored as video_likes rows.",
  saves: "Save taps stored as video_saves rows.",
  shares: "Share events recorded from the feed.",
  product_clicks: "Taps on a tagged product in a video.",
  enquiries: "Messages sent to this shop from storefronts.",
  order_requests: "Checkout requests created for this shop, including unpaid requests.",
  confirmed_orders: "Orders past request/pending that a seller or payment webhook confirmed. Not a client success toast.",
  attributed_orders: "Confirmed orders that include a product tagged on one of this shop's videos. Correlation, not a paid-ad claim.",
} as const;
