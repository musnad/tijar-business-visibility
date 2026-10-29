"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ImagePlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { inspectShoppingMedia } from "@/lib/video/file-guard";
import { listProducts } from "@/services/product-service";
import { submitStudioVideo } from "@/services/video-studio-service";
import type { Product } from "@/types/database";
import { formatNgn } from "@/utils/money";

export function SellerVideoStudioScreen({
  businessId,
  profileId,
}: {
  businessId: string;
  profileId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"image" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
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
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  async function onFile(next: File | null) {
    setFile(null);
    setKind(null);
    if (!next) return;
    const result = await inspectShoppingMedia(next);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFile(next);
    setKind(result.media);
  }

  async function publish() {
    if (!file) {
      toast.error("Add a photo or video.");
      return;
    }
    if (selected.length === 0) {
      toast.error("Tap one product this post is selling.");
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
      attribution: "business",
      rightsAttested: true,
    });
    setBusy(false);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Posted to For You.");
    if (r.videoId) sessionStorage.setItem("tijar-for-you-video-id", r.videoId);
    await queryClient.invalidateQueries({ queryKey: ["video-feed"] });
    await queryClient.invalidateQueries({ queryKey: ["for-you-listings"] });
    await queryClient.invalidateQueries({ queryKey: ["seller-videos"] });
    void navigate({ to: "/shop", search: r.videoId ? { v: r.videoId } : {} });
  }

  return (
    <>
      <AppPageHeader title="Post to For You" subtitle="Photo or video, one product, publish." />

      <label className="mt-4 flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-card text-center">
        {previewUrl && kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="max-h-80 w-full object-contain" />
        ) : previewUrl && kind === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={previewUrl} controls className="max-h-80 w-full bg-black object-contain" />
        ) : (
          <>
            <ImagePlus className="size-8 text-primary" />
            <p className="mt-2 text-sm font-bold">Add photo or video</p>
            <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP, MP4 or WebM</p>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          capture="environment"
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <Input
        className="mt-4 min-h-12 rounded-xl"
        placeholder="Caption (optional)"
        value={caption}
        maxLength={220}
        onChange={(e) => setCaption(e.target.value)}
      />

      <p className="mt-4 text-sm font-bold">Selling</p>
      {products.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Add a product first.{" "}
          <Link to="/app/products/new" className="font-semibold text-primary">
            New product
          </Link>
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {products.map((p) => (
            <ProductPick
              key={p.id}
              product={p}
              checked={selected.includes(p.id)}
              onToggle={() => {
                setSelected((cur) => (cur.includes(p.id) ? cur.filter((id) => id !== p.id) : [...cur, p.id]));
              }}
            />
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">By publishing, you confirm you own this photo or video.</p>
      <Button type="button" className="mt-3 min-h-12 w-full rounded-xl font-bold" disabled={busy} onClick={() => void publish()}>
        {busy ? "Posting…" : "Publish"}
      </Button>
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
            {product.sale_price != null ? formatNgn(Number(product.sale_price)) : "No price"}
          </span>
        </span>
      </label>
    </li>
  );
}
