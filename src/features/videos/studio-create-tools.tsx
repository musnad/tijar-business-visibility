"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, ImagePlus, Mic, Music, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { composeAdvertClip, startCutePad } from "@/lib/marketing/compose-clip";
import { composeCuteFlyer } from "@/lib/marketing/compose-flyer";
import {
  draftStudioContent,
  STUDIO_PROMPT_PLACEHOLDER,
  type StudioGoal,
  type StudioStyle,
} from "@/lib/marketing/draft-content";
import { MIN_VIDEO_MS, MIN_VIDEO_SEC, MAX_VIDEO_MS, MAX_VIDEO_SEC } from "@/lib/video/file-guard";
import { dataUrlToFile, fileToJpegDataUrl, urlToJpegDataUrl } from "@/lib/marketing/resize-image";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import {
  downloadGrokVideo,
  fetchStudioStatus,
  pollGrokVideo,
  requestFlyer,
  requestGrokVideo,
  speakAdvert,
} from "@/services/studio-client";
import { submitStudioVideo } from "@/services/video-studio-service";
import type { Product } from "@/types/database";
import { formatNgn } from "@/utils/money";

export function StudioCreateTools({
  product,
  products,
  businessId,
  businessName,
  profileId,
  goal,
  style,
  locale,
  seedPrompt,
}: {
  product: Product | null;
  products: Product[];
  businessId: string;
  businessName: string;
  profileId: string;
  goal: StudioGoal;
  style: StudioStyle;
  locale: Locale;
  seedPrompt?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"flyer" | "video" | "record">("flyer");
  const [designOn, setDesignOn] = useState(false);
  const [prompt, setPrompt] = useState(seedPrompt ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState(false);
  const [bgLevel, setBgLevel] = useState(0.12);
  const [voiceOn, setVoiceOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<{
    kind: "image" | "video";
    url: string;
    file: File;
    durationHintMs?: number;
  } | null>(null);
  const [grokOn, setGrokOn] = useState(false);
  const camRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const recStarted = useRef(0);
  const [camLive, setCamLive] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    void fetchStudioStatus().then((s) => {
      setGrokOn(s.grok);
      setDesignOn(Boolean(s.design || s.grok || s.tts));
    });
  }, []);

  useEffect(() => {
    if (!seedPrompt) return;
    setPrompt((cur) => (cur.trim() ? cur : seedPrompt));
  }, [seedPrompt]);

  useEffect(() => {
    if (userPhoto) return;
    if (product?.image_url) setPhotoUrl(product.image_url);
  }, [product?.image_url, userPhoto]);

  useEffect(() => {
    return () => stopCam();
  }, []);

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamLive(false);
    setRecording(false);
  }

  function advertScript() {
    if (prompt.trim()) return prompt.trim();
    if (!product) return `${businessName} — shop on TIJAR.`;
    return draftStudioContent({
      productName: product.name,
      businessName,
      description: product.description,
      notes: product.notes,
      salePrice: product.sale_price,
      unit: product.unit,
      goal,
      style,
      locale,
    }).script;
  }

  async function onPhoto(file: File | null) {
    if (!file) return;
    const url = await fileToJpegDataUrl(file);
    setPhotoUrl(url);
    setUserPhoto(true);
    setPreview(null);
  }

  async function postFile(file: File) {
    if (!product) {
      toast.error("Select a product first.");
      return;
    }
    setBusy(true);
    setStatus("Publishing to For You…");
    const r = await submitStudioVideo({
      businessId,
      profileId,
      file,
      caption: advertScript(),
      productIds: [product.id],
      products: products.map((p) => ({ id: p.id, business_id: p.business_id })),
      attribution: "business",
      rightsAttested: true,
      durationHintMs: preview?.durationHintMs,
    });
    setBusy(false);
    setStatus("");
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Posted to For You.");
    if (r.videoId) sessionStorage.setItem("tijar-for-you-video-id", r.videoId);
    await queryClient.invalidateQueries({ queryKey: ["video-feed"] });
    void navigate({ to: "/shop" });
  }

  async function designStill(): Promise<string | null> {
    const copy = advertScript();
    if (copy.length < 4) {
      toast.error("Write what you want designed.");
      return null;
    }
    let imageDataUrl: string | undefined;
    if (photoUrl) {
      try {
        imageDataUrl = await urlToJpegDataUrl(photoUrl);
      } catch {
        imageDataUrl = undefined;
      }
    }
    const grok = await requestFlyer({
      prompt: copy,
      productName: product?.name ?? "Product",
      businessName,
      style,
      locale,
      imageDataUrl,
    });
    if (grok.dataUrl) return grok.dataUrl;
    return composeCuteFlyer({
      prompt: copy,
      productName: product?.name ?? businessName,
      businessName,
      priceLabel: product?.sale_price != null ? formatNgn(Number(product.sale_price)) : null,
      photoUrl,
      locale,
    });
  }

  async function makePhotoVideo() {
    const script = advertScript();
    if (script.length < 4) {
      toast.error("Write a prompt for the advert.");
      return;
    }
    setBusy(true);
    setPreview(null);
    setStatus("Designing from your prompt…");
    try {
      let still = photoUrl;
      if (!still) {
        still = await designStill();
      } else {
        try {
          still = await urlToJpegDataUrl(photoUrl);
        } catch {
          still = photoUrl;
        }
      }
      if (!still) throw new Error("Could not design a still for the video.");
      if (grokOn) {
        setStatus("Grok is turning your design into video…");
        const started = await requestGrokVideo({
          prompt: script,
          imageDataUrl: still.startsWith("data:") ? still : await urlToJpegDataUrl(still),
          durationSec: 8,
          locale,
        });
        if (started.requestId) {
          const ok = await waitForGrok(started.requestId);
          if (ok) {
            setBusy(false);
            setStatus("");
            return;
          }
        }
        setStatus("Animating your design with voice…");
      }
      const voice = voiceOn ? await speakAdvert(script, locale) : null;
      const blob = await composeAdvertClip({
        photoUrl: still,
        voiceBlob: voice,
        durationSec: 8,
        headline: product?.name ?? businessName,
        bgLevel,
        withVoice: voiceOn,
      });
      const file = new File([blob], `tijar-advert-${Date.now()}.webm`, { type: blob.type || "video/webm" });
      setPreview({ kind: "video", url: URL.createObjectURL(file), file, durationHintMs: 8_000 });
      toast.success("Advert ready. Preview, then post.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not make the video.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function waitForGrok(requestId: string): Promise<boolean> {
    for (let i = 0; i < 24; i += 1) {
      await new Promise((r) => setTimeout(r, 4000));
      const poll = await pollGrokVideo(requestId);
      if (poll.status === "done") {
        setStatus("Downloading Grok video…");
        const blob = await downloadGrokVideo(requestId);
        const file = new File([blob], `tijar-grok-${Date.now()}.mp4`, { type: blob.type || "video/mp4" });
        setPreview({ kind: "video", url: URL.createObjectURL(file), file, durationHintMs: 8_000 });
        toast.success("Grok advert ready.");
        return true;
      }
      if (poll.status === "failed") {
        toast.error(poll.error || "Grok could not finish the video.");
        return false;
      }
      setStatus(`Grok is rendering… ${i * 4 + 4}s`);
    }
    return false;
  }

  async function makeFlyer() {
    setBusy(true);
    setPreview(null);
    setStatus("Designing from your prompt…");
    try {
      const dataUrl = await designStill();
      if (!dataUrl) return;
      const file = dataUrlToFile(dataUrl, `tijar-flyer-${Date.now()}.jpg`);
      setPreview({ kind: "image", url: dataUrl, file });
      toast.success("Design ready. Post it to For You.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not design the flyer.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function openCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: true,
      });
      streamRef.current = stream;
      setCamLive(true);
      requestAnimationFrame(() => {
        if (camRef.current) {
          camRef.current.srcObject = stream;
          void camRef.current.play();
        }
      });
    } catch {
      toast.error("Allow camera and mic, or upload a photo instead.");
    }
  }

  function startRecord() {
    const cam = streamRef.current;
    if (!cam) {
      void openCam();
      return;
    }
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    try {
      audioCtx.createMediaStreamSource(cam).connect(dest);
    } catch {
      /* video-only devices */
    }
    const pad = audioCtx.createGain();
    pad.gain.value = bgLevel;
    startCutePad(audioCtx, pad);
    pad.connect(dest);
    const mixed = new MediaStream([...cam.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const rec = new MediaRecorder(mixed);
    const chunks: Blob[] = [];
    rec.ondataavailable = (ev) => {
      if (ev.data.size) chunks.push(ev.data);
    };
    rec.onstop = () => {
      void audioCtx.close();
      setRecording(false);
      const elapsed = performance.now() - recStarted.current;
      if (elapsed < MIN_VIDEO_MS) {
        toast.error(`Hold at least ${MIN_VIDEO_SEC} seconds so the clip can post.`);
        return;
      }
      const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
      const file = new File([blob], `tijar-self-${Date.now()}.webm`, { type: blob.type });
      setPreview({
        kind: "video",
        url: URL.createObjectURL(file),
        file,
        durationHintMs: Math.min(MAX_VIDEO_MS, Math.round(elapsed)),
      });
      stopCam();
      toast.success("Recording ready.");
    };
    recRef.current = rec;
    recStarted.current = performance.now();
    rec.start(200);
    setRecording(true);
    window.setTimeout(() => {
      if (rec.state !== "inactive") rec.stop();
    }, MAX_VIDEO_MS);
  }

  return (
    <section className="mt-5 rounded-2xl border border-[#EEF1F5] p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#1F7A4D]">Prompt</p>
      <h2 className="mt-1 text-[16px] font-extrabold text-[#0B1F4D]">Ask for any design</h2>
      <p className="mt-1 text-[12px] text-[#6B7280]">
        {designOn
          ? "Write in Hausa, English, Arabic, or any TIJAR language. Flyer, video, or record yourself."
          : "Write your prompt. Local design still works if the image model is offline."}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#F3F4F6] p-1">
        {(
          [
            ["flyer", "Flyer"],
            ["video", "Video"],
            ["record", "Record"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "min-h-10 rounded-lg text-[12px] font-extrabold",
              tab === id ? "bg-white text-[#0B1F4D] shadow-sm" : "text-[#6B7280]",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        maxLength={1200}
        placeholder={STUDIO_PROMPT_PLACEHOLDER[locale]}
        dir={locale === "ar" ? "rtl" : "ltr"}
        lang={locale}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !busy) {
            e.preventDefault();
            if (tab === "video") void makePhotoVideo();
            else if (tab === "flyer") void makeFlyer();
          }
        }}
        className="mt-3 w-full resize-none rounded-2xl border border-[#EEF1F5] bg-[#F8FAF9] px-3 py-3 text-[15px] leading-relaxed text-[#0B1F4D] outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A4D]/30"
      />
      <p className="mt-1 text-right text-[11px] text-[#9CA3AF]">{prompt.trim().length}/1200 · Ctrl+Enter</p>

      {status ? <p className="mt-2 text-[12px] font-semibold text-[#1F7A4D]">{status}</p> : null}

      {tab === "video" ? (
        <Button
          className="relative z-10 mt-3 min-h-12 w-full rounded-xl bg-gradient-to-r from-[#1F7A4D] to-[#0B1F4D] font-extrabold text-white"
          disabled={busy}
          onClick={() => void makePhotoVideo()}
        >
          <Sparkles className="size-4" />
          {busy ? "Designing…" : "Generate video"}
        </Button>
      ) : null}
      {tab === "record" ? (
        <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
          <Button
            className="min-h-12 rounded-xl bg-[#1F7A4D] font-extrabold text-white"
            disabled={busy}
            onClick={() => (recording ? recRef.current?.stop() : startRecord())}
          >
            <Mic className="size-4" />
            {recording ? "Stop" : `Record ${MIN_VIDEO_SEC}–${MAX_VIDEO_SEC}s`}
          </Button>
          <Button variant="outline" className="min-h-12 rounded-xl font-bold" onClick={() => void openCam()}>
            Camera
          </Button>
        </div>
      ) : null}
      {tab === "flyer" ? (
        <Button
          className="relative z-10 mt-3 min-h-12 w-full rounded-xl bg-gradient-to-r from-[#1F7A4D] to-[#0B1F4D] font-extrabold text-white"
          disabled={busy}
          onClick={() => void makeFlyer()}
        >
          <Sparkles className="size-4" />
          {busy ? "Designing…" : "Generate design"}
        </Button>
      ) : null}

      {tab !== "record" ? (
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#1F7A4D]/40 bg-[#F8FAF9] p-3 text-center">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="max-h-40 rounded-xl object-contain" />
          ) : (
            <>
              <ImagePlus className="size-7 text-[#1F7A4D]" />
              <p className="mt-1 text-[13px] font-bold text-[#0B1F4D]">Optional photo</p>
              <p className="text-[11px] text-[#6B7280]">Leave empty — Grok can design from the prompt alone</p>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl bg-[#111827]">
          {camLive ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video ref={camRef} className="aspect-[9/16] max-h-72 w-full object-cover" playsInline muted />
          ) : (
            <button
              type="button"
              className="flex aspect-[16/10] w-full flex-col items-center justify-center text-white"
              onClick={() => void openCam()}
            >
              <Camera className="size-8" />
              <span className="mt-2 text-sm font-bold">Open camera</span>
            </button>
          )}
        </div>
      )}

      {tab !== "flyer" ? (
        <label className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#0B1F4D]">
          <Music className="size-4 text-[#1F7A4D]" />
          Background sound
          <input
            type="range"
            min={0}
            max={0.22}
            step={0.02}
            value={bgLevel}
            onChange={(e) => setBgLevel(Number(e.target.value))}
            className="flex-1"
          />
        </label>
      ) : null}

      {tab === "video" ? (
        <label className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-[#0B1F4D]">
          <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />
          Advert voice-over
        </label>
      ) : null}

      {preview ? (
        <div className="mt-4 space-y-2">
          {preview.kind === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={preview.url} controls playsInline className="w-full rounded-2xl bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="Flyer preview" className="w-full rounded-2xl" />
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="min-h-11 rounded-xl bg-[#1F7A4D] font-extrabold text-white"
              disabled={busy || !product}
              onClick={() => void postFile(preview.file)}
            >
              Post to For You
            </Button>
            <Button variant="outline" className="min-h-11 rounded-xl font-bold" asChild>
              <Link to="/shop/create" search={product ? { productId: product.id } : {}}>
                Open create
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
