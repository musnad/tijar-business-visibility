"use client";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { canUseBusinessMode } from "@/lib/account-mode";
import { fetchCart } from "@/services/marketplace-service";
import { listProducts } from "@/services/product-service";
import type { VideoAttribution } from "@/lib/feed/rank-video-feed";
import { publishShoppingVideo as publishVideo } from "@/services/video-feed-service";

export function VideoCreateScreen() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const businessQuery = usePrimaryBusiness(profile?.id);
  const business = businessQuery.data?.business ?? null;
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [captionsFile, setCaptionsFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [attribution, setAttribution] = useState<VideoAttribution>("business");
  const [busy, setBusy] = useState(false);

  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });
  const productsQuery = useQuery({
    queryKey: ["create-products", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const r = await listProducts(business!.id);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  const allowed = Boolean(session && profile && canUseBusinessMode(profile) && business);
  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;

  return (
    <MarketplaceShell cartCount={cartCount}>
      <h1 className="text-2xl font-extrabold">Create</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Publish a 9:16 shopping video tagged with live products from your catalogue.
      </p>

      {!session && (
        <div className="mt-6 rounded-2xl border border-dashed p-6 text-center">
          <p className="font-bold">Sellers only</p>
          <Button className="mt-3 rounded-xl" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      )}

      {session && !allowed && (
        <div className="mt-6 rounded-2xl border border-dashed p-6 text-center">
          <p className="font-bold">Create is for verified sellers</p>
          <p className="mt-1 text-sm text-muted-foreground">Apply for a business account first.</p>
          <Button className="mt-3 rounded-xl" asChild>
            <Link to="/shop/business-apply">Request business access</Link>
          </Button>
        </div>
      )}

      {allowed && (
        <form
          className="mt-5 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file || !profile || !business) {
              toast.error("Choose a video file.");
              return;
            }
            setBusy(true);
            const { error, videoId } = await publishVideo({
              businessId: business.id,
              profileId: profile.id,
              file,
              caption,
              productIds: selected,
              products: (productsQuery.data ?? []).map((p) => ({ id: p.id, business_id: p.business_id })),
              attribution,
              captionsFile,
            });
            setBusy(false);
            if (error) {
              toast.error(error);
              return;
            }
            toast.success("Video published to For You (pending listing safety).");
            if (videoId) sessionStorage.setItem("tijar-for-you-video-id", videoId);
            void navigate({ to: "/shop" });
          }}
        >
          <label className="block text-sm font-bold">
            Video (MP4, max 80 MB, portrait 9:16)
            <input
              type="file"
              accept="video/mp4,video/webm"
              capture="environment"
              className="mt-1 block w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block text-sm font-bold">
            Captions (optional .vtt)
            <input
              type="file"
              accept=".vtt,text/vtt"
              className="mt-1 block w-full text-sm"
              onChange={(e) => setCaptionsFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block text-sm font-bold">
            Caption
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1 rounded-xl" />
          </label>
          <label className="block text-sm font-bold">
            Attribution
            <select
              className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={attribution}
              onChange={(e) => setAttribution(e.target.value as VideoAttribution)}
            >
              <option value="business">Business-owned</option>
              <option value="creator">Creator</option>
              <option value="sponsored">Sponsored (labelled, demoted in organic rank)</option>
              <option value="ai_assisted">AI-assisted</option>
            </select>
          </label>
          <div>
            <p className="text-sm font-bold">Tag live products</p>
            <ul className="mt-2 space-y-2">
              {(productsQuery.data ?? []).map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={(e) => {
                        setSelected((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                        );
                      }}
                    />
                    {p.name}
                    {p.sale_price != null ? ` · ₦${p.sale_price}` : ""}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <Button type="submit" className="w-full rounded-xl font-bold" disabled={busy}>
            {busy ? "Uploading…" : "Publish"}
          </Button>
        </form>
      )}
    </MarketplaceShell>
  );
}
