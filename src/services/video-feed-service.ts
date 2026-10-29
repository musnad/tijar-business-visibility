import { applyOrganicInterleave, rankVideoFeed, type RankableVideo, type ViewerSignals, type VideoAttribution } from "@/lib/feed/rank-video-feed";
import { assertProductsBelongToBusiness, requireShoppingTags } from "@/lib/feed/video-tag-guard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PublicProduct } from "@/types/database";

export type PublicFeedVideo = {
  id: string;
  business_id: string;
  profile_id: string;
  caption: string | null;
  captions_url: string | null;
  cover_path: string | null;
  playback_url: string | null;
  storage_path: string;
  duration_ms: number | null;
  attribution: VideoAttribution;
  like_count: number;
  comment_count: number;
  save_count: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
  slug: string;
  business_name: string;
  business_logo_url: string | null;
  is_verified: boolean;
  verification_status: string;
  category_id: string | null;
  category_name: string | null;
  product_ids: string[];
};

export type VideoComment = {
  id: string;
  video_post_id: string;
  profile_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author_name?: string;
};

function publicPlaybackUrl(storagePath: string, playbackUrl: string | null): string {
  if (playbackUrl) return playbackUrl;
  const supabase = getSupabaseBrowserClient();
  return supabase.storage.from("business-videos").getPublicUrl(storagePath).data.publicUrl;
}

export function resolveVideoSrc(row: PublicFeedVideo): string {
  return publicPlaybackUrl(row.storage_path, row.playback_url);
}

export function resolveCoverSrc(coverPath: string | null): string | null {
  if (!coverPath) return null;
  if (coverPath.startsWith("http")) return coverPath;
  const supabase = getSupabaseBrowserClient();
  return supabase.storage.from("business-videos").getPublicUrl(coverPath).data.publicUrl;
}

export async function fetchPublicVideoFeed(): Promise<{
  videos: PublicFeedVideo[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("public_video_feed")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(80);
  if (error) return { videos: [], error: error.message };
  return { videos: (data ?? []) as PublicFeedVideo[], error: null };
}

export async function fetchFeedViewerSignals(profileId: string | null): Promise<ViewerSignals> {
  const empty: ViewerSignals = {
    followedBusinessIds: [],
    preferredCategoryIds: [],
    savedProductIds: [],
    completedVideoIds: [],
    blockedProfileIds: [],
    mutedProfileIds: [],
  };
  if (!profileId) return empty;
  const supabase = getSupabaseBrowserClient();
  const [follows, favs, blocks, mutes, completes] = await Promise.all([
    supabase.from("business_follows").select("business_id").eq("profile_id", profileId),
    supabase.from("marketplace_favorites").select("product_id").eq("profile_id", profileId).not("product_id", "is", null),
    supabase.from("account_blocks").select("blocked_profile_id").eq("blocker_id", profileId),
    supabase.from("account_mutes").select("muted_profile_id").eq("muter_id", profileId),
    supabase.from("feed_events").select("video_post_id").eq("profile_id", profileId).eq("kind", "complete").limit(80),
  ]);
  const categoryPref = new Set<string>();
  return {
    followedBusinessIds: (follows.data ?? []).map((r) => r.business_id as string),
    preferredCategoryIds: [...categoryPref],
    savedProductIds: (favs.data ?? []).map((r) => r.product_id as string).filter(Boolean),
    completedVideoIds: (completes.data ?? []).map((r) => r.video_post_id as string),
    blockedProfileIds: (blocks.data ?? []).map((r) => r.blocked_profile_id as string),
    mutedProfileIds: (mutes.data ?? []).map((r) => r.muted_profile_id as string),
  };
}

export async function rankAndLoadFeed(profileId: string | null): Promise<{
  videos: PublicFeedVideo[];
  error: string | null;
}> {
  const raw = await fetchPublicVideoFeed();
  if (raw.error) return raw;
  const signals = await fetchFeedViewerSignals(profileId);
  const productIds = [...new Set(raw.videos.flatMap((v) => v.product_ids ?? []))];
  const live = await fetchLiveProductsByIds(productIds);
  const liveMap = new Map(live.products.map((p) => [p.id, p]));

  const captions: Record<string, string> = {};
  const rankable: RankableVideo[] = raw.videos.map((v) => {
    captions[v.id] = `${v.caption ?? ""} ${v.business_name}`;
    const tagged = (v.product_ids ?? []).map((id) => liveMap.get(id)).filter(Boolean);
    return {
      id: v.id,
      businessId: v.business_id,
      profileId: v.profile_id,
      categoryId: v.category_id,
      productIds: v.product_ids ?? [],
      publishedAt: v.published_at,
      createdAt: v.created_at,
      likeCount: Number(v.like_count),
      viewCount: Number(v.view_count),
      attribution: v.attribution,
      hasAvailableProduct: tagged.some((p) => p && p.is_available !== false && p.sale_price != null),
    };
  });
  signals.videoCaptions = captions;
  signals.preferredCategoryIds = [
    ...new Set(
      raw.videos
        .filter((v) => signals.followedBusinessIds.includes(v.business_id) && v.category_id)
        .map((v) => v.category_id as string),
    ),
  ];

  const ranked = rankVideoFeed(rankable, signals);
  const byId = new Map(raw.videos.map((v) => [v.id, v]));
  const ordered = applyOrganicInterleave(
    ranked.filter((r) => r.score > -1000).map((r) => r.videoId),
    byId,
  );
  return { videos: ordered.map((id) => byId.get(id)!).filter(Boolean), error: null };
}

export async function fetchLiveProductsByIds(ids: string[]): Promise<{
  products: PublicProduct[];
  error: string | null;
}> {
  if (ids.length === 0) return { products: [], error: null };
  const supabase = getSupabaseBrowserClient();
  let { data, error } = await supabase
    .from("public_business_products")
    .select(
      "id, business_id, name, kind, description, sale_price, unit, image_url, extra_image_urls, attributes, variants, is_available, business_name, business_slug, service_type, starts_on, ends_on",
    )
    .in("id", ids);
  if (error && /service_type|starts_on|ends_on/i.test(error.message)) {
    const retry = await supabase
      .from("public_business_products")
      .select(
        "id, business_id, name, kind, description, sale_price, unit, image_url, extra_image_urls, attributes, variants, is_available, business_name, business_slug",
      )
      .in("id", ids);
    data = retry.data;
    error = retry.error;
  }
  if (error) return { products: [], error: error.message };
  return { products: (data ?? []) as PublicProduct[], error: null };
}

export async function fetchMyLikedVideoIds(profileId: string): Promise<Set<string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("video_likes").select("video_post_id").eq("profile_id", profileId);
  return new Set((data ?? []).map((r) => r.video_post_id as string));
}

export async function fetchMySavedVideoIds(profileId: string): Promise<Set<string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("video_saves").select("video_post_id").eq("profile_id", profileId);
  return new Set((data ?? []).map((r) => r.video_post_id as string));
}

export async function fetchMyFollowedBusinessIds(profileId: string): Promise<Set<string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("business_follows").select("business_id").eq("profile_id", profileId);
  return new Set((data ?? []).map((r) => r.business_id as string));
}

export async function toggleVideoLike(profileId: string, videoId: string): Promise<{ liked: boolean; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data: existing } = await supabase
    .from("video_likes")
    .select("profile_id")
    .eq("profile_id", profileId)
    .eq("video_post_id", videoId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("video_likes").delete().eq("profile_id", profileId).eq("video_post_id", videoId);
    return { liked: false, error: error?.message ?? null };
  }
  const { error } = await supabase.from("video_likes").insert({ profile_id: profileId, video_post_id: videoId });
  if (error?.code === "23505") return { liked: true, error: null };
  return { liked: true, error: error?.message ?? null };
}

export async function toggleVideoSave(profileId: string, videoId: string): Promise<{ saved: boolean; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data: existing } = await supabase
    .from("video_saves")
    .select("profile_id")
    .eq("profile_id", profileId)
    .eq("video_post_id", videoId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("video_saves").delete().eq("profile_id", profileId).eq("video_post_id", videoId);
    return { saved: false, error: error?.message ?? null };
  }
  const { error } = await supabase.from("video_saves").insert({ profile_id: profileId, video_post_id: videoId });
  return { saved: true, error: error?.message ?? null };
}

export async function toggleFollowBusiness(
  profileId: string,
  businessId: string,
): Promise<{ following: boolean; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data: existing } = await supabase
    .from("business_follows")
    .select("profile_id")
    .eq("profile_id", profileId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("business_follows")
      .delete()
      .eq("profile_id", profileId)
      .eq("business_id", businessId);
    return { following: false, error: error?.message ?? null };
  }
  const { error } = await supabase.from("business_follows").insert({ profile_id: profileId, business_id: businessId });
  return { following: true, error: error?.message ?? null };
}

export async function fetchVideoComments(videoId: string): Promise<{ comments: VideoComment[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("video_comments")
    .select("id, video_post_id, profile_id, parent_id, body, created_at")
    .eq("video_post_id", videoId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return { comments: [], error: error.message };
  const comments = (data ?? []) as VideoComment[];
  const ids = [...new Set(comments.map((c) => c.profile_id))];
  if (ids.length === 0) return { comments, error: null };
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));
  return {
    comments: comments.map((c) => ({ ...c, author_name: names.get(c.profile_id) ?? "Shopper" })),
    error: null,
  };
}

export async function postVideoComment(input: {
  profileId: string;
  videoId: string;
  body: string;
  parentId?: string | null;
}): Promise<{ error: string | null }> {
  const text = input.body.trim();
  if (!text) return { error: "Write a comment first." };
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("video_comments").insert({
    profile_id: input.profileId,
    video_post_id: input.videoId,
    parent_id: input.parentId ?? null,
    body: text,
  });
  return { error: error?.message ?? null };
}

export async function reportVideo(input: {
  reporterId: string;
  videoId: string;
  businessId: string;
  reason: "spam" | "scam" | "hate" | "sexual" | "violence" | "other";
  details?: string;
}): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("video_reports").insert({
    reporter_id: input.reporterId,
    video_post_id: input.videoId,
    business_id: input.businessId,
    reason: input.reason,
    details: input.details?.trim() || null,
  });
  if (error?.code === "23505") return { error: "You already reported this video." };
  return { error: error?.message ?? null };
}

export async function blockProfile(blockerId: string, blockedId: string): Promise<{ error: string | null }> {
  if (blockerId === blockedId) return { error: "You cannot block yourself." };
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("account_blocks")
    .insert({ blocker_id: blockerId, blocked_profile_id: blockedId });
  if (error?.code === "23505") return { error: null };
  return { error: error?.message ?? null };
}

export async function muteProfile(muterId: string, mutedId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("account_mutes").insert({ muter_id: muterId, muted_profile_id: mutedId });
  if (error?.code === "23505") return { error: null };
  return { error: error?.message ?? null };
}

export async function recordFeedSignal(
  videoId: string,
  kind: "view" | "complete" | "product_tap" | "add_to_cart" | "share" | "like" | "impression",
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.rpc("record_feed_event", { p_video_id: videoId, p_kind: kind });
}

export async function publishShoppingVideo(input: {
  businessId: string;
  profileId: string;
  file: File;
  caption: string;
  productIds: string[];
  products: { id: string; business_id: string }[];
  attribution: VideoAttribution;
  captionsFile?: File | null;
}): Promise<{ error: string | null; videoId?: string }> {
  const tags = requireShoppingTags(input.productIds);
  if (!tags.ok) return { error: tags.error };
  const owned = input.products.filter((p) => input.productIds.includes(p.id));
  const guard = assertProductsBelongToBusiness(input.businessId, owned);
  if (!guard.ok) return { error: guard.error };
  if (!input.file.type.startsWith("video/")) return { error: "Choose an MP4 or WebM video." };
  if (input.file.size > 80 * 1024 * 1024) return { error: "Video must be under 80 MB." };

  const supabase = getSupabaseBrowserClient();
  const id = crypto.randomUUID();
  const ext = input.file.name.split(".").pop()?.toLowerCase() === "webm" ? "webm" : "mp4";
  const storagePath = `${input.businessId}/${id}.${ext}`;
  const { error: upErr } = await supabase.storage.from("business-videos").upload(storagePath, input.file, {
    contentType: input.file.type,
    upsert: false,
  });
  if (upErr) return { error: upErr.message };

  let captionsUrl: string | null = null;
  if (input.captionsFile) {
    const capPath = `${input.businessId}/${id}.vtt`;
    const cap = await supabase.storage.from("business-videos").upload(capPath, input.captionsFile, {
      contentType: "text/vtt",
      upsert: false,
    });
    if (!cap.error) {
      captionsUrl = supabase.storage.from("business-videos").getPublicUrl(capPath).data.publicUrl;
    }
  }

  const playbackUrl = supabase.storage.from("business-videos").getPublicUrl(storagePath).data.publicUrl;
  const { error: rowErr } = await supabase.from("video_posts").insert({
    id,
    business_id: input.businessId,
    profile_id: input.profileId,
    caption: input.caption.trim() || null,
    captions_url: captionsUrl,
    storage_path: storagePath,
    playback_url: playbackUrl,
    status: "ready",
    moderation_status: "pending",
    attribution: input.attribution,
    published_at: new Date().toISOString(),
  });
  if (rowErr) return { error: rowErr.message };

  const rows = input.productIds.map((productId, sort_order) => ({
    video_post_id: id,
    product_id: productId,
    sort_order,
  }));
  const { error: tagErr } = await supabase.from("video_post_products").insert(rows);
  if (tagErr) return { error: tagErr.message };
  return { error: null, videoId: id };
}
