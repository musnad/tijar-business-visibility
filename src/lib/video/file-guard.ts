/** Never trust filename or declared MIME type alone. */

export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const MAX_VIDEO_MS = 180_000;
export const MIN_VIDEO_MS = 1_000;

export type DetectedVideoKind = "mp4" | "webm";

export function sniffVideoKind(bytes: Uint8Array): DetectedVideoKind | null {
  if (bytes.length < 12) return null;
  // ISO BMFF / MP4: size + 'ftyp' at offset 4
  const box = String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!);
  if (box === "ftyp") return "mp4";
  // WebM / Matroska EBML header 1A 45 DF A3
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "webm";
  return null;
}

export function validateVideoFileMeta(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size <= 0) return { ok: false, error: "The video file is empty." };
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: "Video must be under 80 MB." };
  return { ok: true };
}

export async function inspectVideoFile(file: File): Promise<{
  ok: true;
  kind: DetectedVideoKind;
  durationMs: number;
  width: number;
  height: number;
} | { ok: false; error: string }> {
  const meta = validateVideoFileMeta(file);
  if (!meta.ok) return meta;
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const kind = sniffVideoKind(header);
  if (!kind) {
    return { ok: false, error: "File is not a real MP4 or WebM video (header check failed)." };
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const stats = await readMediaElement(objectUrl);
    if (stats.durationMs < MIN_VIDEO_MS) return { ok: false, error: "Video is too short." };
    if (stats.durationMs > MAX_VIDEO_MS) return { ok: false, error: "Video must be 3 minutes or less." };
    if (stats.width < 1 || stats.height < 1) return { ok: false, error: "Could not read video dimensions." };
    return { ok: true, kind, ...stats };
  } catch {
    return { ok: false, error: "Could not decode this video in the browser." };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readMediaElement(src: string): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.muted = true;
    el.playsInline = true;
    const timer = window.setTimeout(() => {
      el.src = "";
      reject(new Error("timeout"));
    }, 12_000);
    el.onloadedmetadata = () => {
      window.clearTimeout(timer);
      resolve({
        durationMs: Math.round((el.duration || 0) * 1000),
        width: el.videoWidth,
        height: el.videoHeight,
      });
    };
    el.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("decode"));
    };
    el.src = src;
  });
}

export async function captureVideoThumbnail(file: File): Promise<Blob | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("thumb"));
    });
    video.currentTime = Math.min(0.4, (video.duration || 1) * 0.1);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
