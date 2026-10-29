"use client";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import type { VideoAttribution } from "@/lib/feed/rank-video-feed";
import { inspectVideoFile } from "@/lib/video/file-guard";
import { listProducts } from "@/services/product-service";
import { submitStudioVideo } from "@/services/video-studio-service";
import type { Product } from "@/types/database";
import { formatNgn } from "@/utils/money";

const STEPS = ["Product", "Video", "Caption", "Preview", "Rights"] as const;

export function SellerVideoStudioScreen({
  businessId,
  profileId,
}: {
  businessId: string;
  profileId: string;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [attribution, setAttribution] = useState<VideoAttribution>("business");
  const [studioNote, setStudioNote] = useState("");
  const [inspectNote, setInspectNote] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["create-products", businessId],
    queryFn: async () => {
      const r = await listProducts(businessId);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  const products = productsQuery.data ?? [];
  const tagged = products.filter((p) => selected.includes(p.id));
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  async function onVideo(next: File | null) {
    setFile(next);
    setInspectNote("");
    if (!next) return;
    const result = await inspectVideoFile(next);
    if (!result.ok) {
      setFile(null);
      toast.error(result.error);
      return;
    }
    setInspectNote(`${result.kind.toUpperCase()} · ${Math.round(result.durationMs / 1000)}s · ${result.width}×${result.height}`);
  }

  async function submit(asDraft: boolean) {
    if (!file) {
      toast.error("Choose a video that passed the file check.");
      return;
    }
    setBusy(true);
    const r = await submitStudioVideo({
      businessId,
      profileId,
      file,
      caption,
      productIds: selected,
      products: products.map((p) => ({ id: p.id, business_id: p.business_id })),
      attribution,
      thumbnail: thumb,
      rightsAttested: rights,
      asDraft,
    });
    setBusy(false);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success(asDraft ? "Draft saved." : "Submitted for moderation. HLS/transcode is not connected — original file is stored.");
    void navigate({ to: "/app/videos" });
  }

  return (
    <>
      <AppPageHeader title="Publish shopping video" subtitle="Tag live catalogue items. Status: draft → processing → pending moderation → published." />
      <ol className="mt-4 flex gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {STEPS.map((label, i) => (
          <li key={label} className={`rounded-full px-2 py-1 ${i === step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="mt-4 space-y-2">
          <p className="text-sm font-bold">Select catalogue items this video sells</p>
          {(productsQuery.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add a product first.{" "}
              <Link to="/app/products/new" className="font-semibold text-primary">
                New product
              </Link>
            </p>
          )}
          <ul className="space-y-2">
            {products.map((p) => (
              <ProductPick key={p.id} product={p} checked={selected.includes(p.id)} onToggle={() => {
                setSelected((cur) => (cur.includes(p.id) ? cur.filter((id) => id !== p.id) : [...cur, p.id]));
              }} />
            ))}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            MP4 or WebM, max 80 MB and 3 minutes. The file header is checked — a renamed photo will be rejected.
          </p>
          <label className="block text-sm font-bold">
            Upload video
            <input type="file" accept="video/mp4,video/webm" className="mt-1 block w-full text-sm" onChange={(e) => void onVideo(e.target.files?.[0] ?? null)} />
          </label>
          {inspectNote && <p className="text-xs font-semibold text-emerald-800">{inspectNote}</p>}
          <label className="block text-sm font-bold">
            Thumbnail (optional JPEG)
            <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
          </label>
          <p className="text-xs text-muted-foreground">
            TIJAR AI Marketing Studio does not generate videos yet. You can only attach a caption draft from Studio.
          </p>
          <Input
            placeholder="Optional studio caption to paste"
            value={studioNote}
            onChange={(e) => {
              setStudioNote(e.target.value);
              if (e.target.value.trim()) setCaption(e.target.value);
            }}
          />
        </section>
      )}

      {step === 2 && (
        <section className="mt-4 space-y-3">
          <label className="block text-sm font-bold">
            Caption
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1 rounded-xl" maxLength={220} />
          </label>
          <label className="block text-sm font-bold">
            Attribution
            <select className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" value={attribution} onChange={(e) => setAttribution(e.target.value as VideoAttribution)}>
              <option value="business">Business-owned</option>
              <option value="creator">Creator</option>
              <option value="sponsored">Sponsored</option>
              <option value="ai_assisted">AI-assisted caption/edit</option>
            </select>
          </label>
        </section>
      )}

      {step === 3 && (
        <section className="mt-4 space-y-3">
          {previewUrl && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={previewUrl} controls className="aspect-[9/16] max-h-80 w-full rounded-2xl bg-black object-contain" />
          )}
          <p className="font-bold">{caption || "No caption"}</p>
          <ul className="text-sm text-muted-foreground">
            {tagged.map((p) => (
              <li key={p.id}>
                {p.name} · {p.sale_price != null ? formatNgn(Number(p.sale_price)) : "no price"}
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 4 && (
        <section className="mt-4 space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={rights} onChange={(e) => setRights(e.target.checked)} />
            I own this video or have permission to publish it on TIJAR, and tagged products belong to this shop.
          </label>
          <p className="text-xs text-muted-foreground">
            Adaptive HLS transcoding is not configured. Playback uses the uploaded file after a prepare job. Moderators still review before the public feed.
          </p>
        </section>
      )}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 && (
          <Button
            type="button"
            className="flex-1 rounded-xl"
            onClick={() => {
              if (step === 0 && selected.length === 0) {
                toast.error("Tag at least one of your products.");
                return;
              }
              if (step === 1 && !file) {
                toast.error("Upload a validated video first.");
                return;
              }
              setStep((s) => s + 1);
            }}
          >
            Next
          </Button>
        )}
        {step === STEPS.length - 1 && (
          <>
            <Button type="button" variant="outline" className="rounded-xl" disabled={busy} onClick={() => void submit(true)}>
              Save draft
            </Button>
            <Button type="button" className="flex-1 rounded-xl" disabled={busy || !rights} onClick={() => void submit(false)}>
              {busy ? "Uploading…" : "Submit"}
            </Button>
          </>
        )}
      </div>
    </>
  );
}

function ProductPick({ product, checked, onToggle }: { product: Product; checked: boolean; onToggle: () => void }) {
  return (
    <li>
      <label className="flex items-center gap-3 rounded-xl border border-border p-2 text-sm">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="size-10 rounded-lg object-cover" />
        ) : (
          <span className="size-10 rounded-lg bg-muted" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{product.name}</span>
          <span className="text-xs text-muted-foreground">
            {product.sale_price != null ? formatNgn(Number(product.sale_price)) : "No price"} · {product.is_published === false ? "unpublished" : "listed"}
          </span>
        </span>
      </label>
    </li>
  );
}
