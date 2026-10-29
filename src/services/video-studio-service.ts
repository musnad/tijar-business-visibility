import type { VideoAttribution } from "@/lib/feed/rank-video-feed";
import { assertProductsBelongToBusiness, requireShoppingTags } from "@/lib/feed/video-tag-guard";
import { captureVideoThumbnail, inspectVideoFile } from "@/lib/video/file-guard";
import { videoPublicStatus } from "@/lib/video/publish-status";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export { videoPublicStatus };

export type StudioSubmitInput = {
  businessId: string;
  profileId: string;
  file: File;
  caption: string;
  productIds: string[];
  products: { id: string; business_id: string }[];
  attribution: VideoAttribution;
  thumbnail?: File | null;
  rightsAttested: boolean;
  asDraft?: boolean;
};

export async function submitStudioVideo(input: StudioSubmitInput): Promise<{ error: string | null; videoId?: string }> {
  if (!input.rightsAttested && !input.asDraft) {
    return { error: "Confirm you own this video or have rights to publish it." };
  }
  const tags = requireShoppingTags(input.productIds);
  if (!tags.ok) return { error: tags.error };
  const owned = input.products.filter((p) => input.productIds.includes(p.id));
  const guard = assertProductsBelongToBusiness(input.businessId, owned);
  if (!guard.ok) return { error: guard.error };

  const inspected = await inspectVideoFile(input.file);
  if (!inspected.ok) return { error: inspected.error };

  const supabase = getSupabaseBrowserClient();
  const id = crypto.randomUUID();
  const ext = inspected.kind === "webm" ? "webm" : "mp4";
  const storagePath = `${input.businessId}/${id}.${ext}`;
  const { error: upErr } = await supabase.storage.from("business-videos").upload(storagePath, input.file, {
    contentType: inspected.kind === "webm" ? "video/webm" : "video/mp4",
    upsert: false,
  });
  if (upErr) return { error: upErr.message };

  let coverPath: string | null = null;
  const thumb = input.thumbnail ?? (await blobToFile(await captureVideoThumbnail(input.file), `${id}.jpg`));
  if (thumb) {
    const thumbPath = `${input.businessId}/${id}.jpg`;
    const t = await supabase.storage.from("business-videos").upload(thumbPath, thumb, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (!t.error) coverPath = thumbPath;
  }

  const playbackUrl = supabase.storage.from("business-videos").getPublicUrl(storagePath).data.publicUrl;
  let status: string = input.asDraft ? "draft" : "processing";
  let { error: rowErr } = await supabase.from("video_posts").insert({
    id,
    business_id: input.businessId,
    profile_id: input.profileId,
    caption: input.caption.trim() || null,
    storage_path: storagePath,
    playback_url: playbackUrl,
    cover_path: coverPath,
    duration_ms: inspected.durationMs,
    width: inspected.width,
    height: inspected.height,
    status,
    moderation_status: "pending",
    attribution: input.attribution,
    rights_attested_at: input.rightsAttested ? new Date().toISOString() : null,
    published_at: null,
  });
  if (rowErr && /rights_attested/i.test(rowErr.message)) {
    const retry = await supabase.from("video_posts").insert({
      id,
      business_id: input.businessId,
      profile_id: input.profileId,
      caption: input.caption.trim() || null,
      storage_path: storagePath,
      playback_url: playbackUrl,
      cover_path: coverPath,
      duration_ms: inspected.durationMs,
      width: inspected.width,
      height: inspected.height,
      status,
      moderation_status: "pending",
      attribution: input.attribution,
      published_at: null,
    });
    rowErr = retry.error;
  }
  if (rowErr && /invalid input value for enum video_post_status/i.test(rowErr.message)) {
    status = input.asDraft ? "uploading" : "processing";
    const retry = await supabase.from("video_posts").insert({
      id,
      business_id: input.businessId,
      profile_id: input.profileId,
      caption: input.caption.trim() || null,
      storage_path: storagePath,
      playback_url: playbackUrl,
      cover_path: coverPath,
      duration_ms: inspected.durationMs,
      width: inspected.width,
      height: inspected.height,
      status,
      moderation_status: "pending",
      attribution: input.attribution,
      published_at: null,
    });
    rowErr = retry.error;
  }
  if (rowErr) return { error: rowErr.message };

  const rows = input.productIds.map((productId, sort_order) => ({
    video_post_id: id,
    product_id: productId,
    sort_order,
  }));
  const { error: tagErr } = await supabase.from("video_post_products").insert(rows);
  if (tagErr) return { error: tagErr.message };

  const jobInsert = await supabase.from("video_processing_jobs").insert({
    video_post_id: id,
    business_id: input.businessId,
    kind: "prepare",
    status: "queued",
    attempts: 0,
  });
  if (jobInsert.error && !/does not exist|schema cache|relation/i.test(jobInsert.error.message)) {
    return { error: jobInsert.error.message, videoId: id };
  }

  if (!input.asDraft) {
    const finished = await finishPrepareJob(id, input.businessId);
    if (finished.error) return { error: finished.error, videoId: id };
  }
  return { error: null, videoId: id };
}

export async function finishPrepareJob(videoId: string, _businessId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const rpc = await supabase.rpc("finish_video_prepare_job", { p_video_id: videoId });
  if (!rpc.error) return { error: null };

  // Fallback if migration 000021 is not applied yet — still never stamp published_at.
  if (!/does not exist|schema cache|function/i.test(rpc.error.message)) {
    return { error: rpc.error.message };
  }

  const { error } = await supabase
    .from("video_posts")
    .update({
      status: "ready",
      processing_error: null,
    })
    .eq("id", videoId)
    .eq("business_id", _businessId);

  if (error) {
    await supabase.from("video_posts").update({ status: "failed", processing_error: error.message }).eq("id", videoId);
    return { error: error.message };
  }
  return { error: null };
}

export async function retryVideoJob(videoId: string, businessId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("video_processing_jobs").insert({
    video_post_id: videoId,
    business_id: businessId,
    kind: "prepare",
    status: "queued",
    attempts: 0,
  });
  return finishPrepareJob(videoId, businessId);
}

function blobToFile(blob: Blob | null, name: string): File | null {
  if (!blob) return null;
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}
