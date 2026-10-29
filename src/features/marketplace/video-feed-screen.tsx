"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bookmark,
  Flag,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Share2,
  ShoppingBag,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";
import { addToCart, fetchCart, fetchMarketplaceProducts, toggleFavoriteProduct } from "@/services/marketplace-service";
import { ProductCard } from "@/features/marketplace/product-card";
import {
  blockProfile,
  fetchLiveProductsByIds,
  fetchMyFollowedBusinessIds,
  fetchMyLikedVideoIds,
  fetchMySavedVideoIds,
  fetchVideoComments,
  muteProfile,
  postVideoComment,
  rankAndLoadFeed,
  recordFeedSignal,
  reportVideo,
  resolveCoverSrc,
  resolveVideoSrc,
  toggleFollowBusiness,
  toggleVideoLike,
  toggleVideoSave,
  type PublicFeedVideo,
} from "@/services/video-feed-service";
import type { PublicProduct } from "@/types/database";
import { formatNgn } from "@/utils/money";

const MUTE_KEY = "tijar-feed-muted";
const POSITION_KEY = "tijar-for-you-video-id";
const DATA_SAVER_KEY = "tijar-feed-data-saver";

function attributionLabel(kind: PublicFeedVideo["attribution"]): string {
  if (kind === "creator") return "Creator";
  if (kind === "sponsored") return "Sponsored";
  if (kind === "ai_assisted") return "AI-assisted";
  return "Business";
}

export function VideoFeedScreen({ initialVideoId }: { initialVideoId?: string }) {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(initialVideoId ?? null);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(MUTE_KEY) !== "0";
  });
  const [dataSaver, setDataSaver] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DATA_SAVER_KEY) === "1";
  });
  const [paused, setPaused] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const feedQuery = useQuery({
    queryKey: ["video-feed", profile?.id ?? "anon"],
    queryFn: async () => {
      const r = await rankAndLoadFeed(profile?.id ?? null);
      if (r.error) throw new Error(r.error);
      return r.videos;
    },
    staleTime: 20_000,
  });

  const listingsQuery = useQuery({
    queryKey: ["for-you-listings"],
    queryFn: async () => {
      const r = await fetchMarketplaceProducts(24);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
    staleTime: 20_000,
  });

  const videos = feedQuery.data ?? [];
  const liveListings = listingsQuery.data ?? [];
  const productIds = useMemo(
    () => [...new Set(videos.flatMap((v) => v.product_ids ?? []))],
    [videos],
  );

  const productsQuery = useQuery({
    queryKey: ["video-feed-products", productIds.join(",")],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const r = await fetchLiveProductsByIds(productIds);
      if (r.error) throw new Error(r.error);
      return r.products;
    },
  });

  const likedQuery = useQuery({
    queryKey: ["video-likes", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchMyLikedVideoIds(profile!.id),
  });
  const savedQuery = useQuery({
    queryKey: ["video-saves", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchMySavedVideoIds(profile!.id),
  });
  const followQuery = useQuery({
    queryKey: ["video-follows", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchMyFollowedBusinessIds(profile!.id),
  });
  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });

  const productsById = useMemo(() => {
    const m = new Map<string, PublicProduct>();
    for (const p of productsQuery.data ?? []) m.set(p.id, p);
    return m;
  }, [productsQuery.data]);

  const active = videos.find((v) => v.id === activeId) ?? videos[0] ?? null;

  useEffect(() => {
    if (videos.length === 0) return;
    const stored = initialVideoId || (typeof window !== "undefined" ? sessionStorage.getItem(POSITION_KEY) : null);
    const start = stored && videos.some((v) => v.id === stored) ? stored : videos[0]!.id;
    setActiveId(start);
    const node = scrollerRef.current?.querySelector(`[data-video-id="${start}"]`);
    node?.scrollIntoView({ block: "start" });
  }, [videos, initialVideoId]);

  useEffect(() => {
    if (activeId) sessionStorage.setItem(POSITION_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = (visible?.target as HTMLElement | undefined)?.dataset.videoId;
        if (id) setActiveId(id);
      },
      { root, threshold: [0.55, 0.75] },
    );
    root.querySelectorAll("[data-video-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [videos.length]);

  useEffect(() => {
    if (!activeId) return;
    void recordFeedSignal(activeId, "impression");
    void recordFeedSignal(activeId, "view");
  }, [activeId]);

  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;

  function requireUser(): boolean {
    if (!session || !profile) {
      toast.message("Sign in to do that.");
      void navigate({ to: "/login" });
      return false;
    }
    return true;
  }

  return (
    <MarketplaceShell cartCount={cartCount} hideTopBar mapLayout>
      <div className="relative mx-auto w-full max-w-lg lg:max-w-md">
        {videos.length > 0 && liveListings.length > 0 && (
          <div className="mb-2 rounded-2xl bg-background px-1 py-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <p className="text-xs font-extrabold uppercase tracking-wide">Just listed</p>
              <Link to="/shop/discover" className="text-[11px] font-semibold text-primary">
                Discover
              </Link>
            </div>
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {liveListings.slice(0, 12).map((p) => (
                <li key={p.id} className="w-36 shrink-0">
                  <ProductCard product={p} compact />
                </li>
              ))}
            </ul>
          </div>
        )}
        {feedQuery.isLoading && (
          <div className="flex h-[calc(100dvh-4.25rem)] items-center justify-center rounded-[1.5rem] bg-muted">
            <p className="text-sm text-muted-foreground">Loading For You…</p>
          </div>
        )}
        {feedQuery.isError && (
          <div className="flex h-[calc(100dvh-4.25rem)] flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed p-6 text-center">
            <p className="font-bold">Could not load videos</p>
            <p className="text-sm text-muted-foreground">Apply the video migration and try again.</p>
            <Button onClick={() => void feedQuery.refetch()}>Retry</Button>
          </div>
        )}
        {!feedQuery.isLoading && !feedQuery.isError && videos.length === 0 && (
          <div className="flex max-h-[calc(100dvh-4.25rem)] flex-col overflow-y-auto rounded-[1.5rem] border border-dashed p-4">
            <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-2 text-center font-extrabold">Live marketplace</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Priced products and services appear here as soon as a shop saves them. Videos show above when published.
            </p>
            {liveListings.length === 0 ? (
              <Button asChild className="mx-auto mt-4 rounded-xl font-bold">
                <Link to="/shop/discover">Open Discover</Link>
              </Button>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {liveListings.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} compact />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div
          ref={scrollerRef}
          className="h-[calc(100dvh-4.25rem)] snap-y snap-mandatory overflow-y-auto overscroll-y-contain rounded-[1.25rem] bg-black lg:h-[min(86dvh,820px)]"
        >
          {videos.map((video, index) => {
            const near = activeId === video.id || videos.findIndex((v) => v.id === activeId) === index - 1;
            return (
              <VideoSlide
                key={video.id}
                video={video}
                active={activeId === video.id}
                muted={muted}
                paused={paused || reducedMotion || dataSaver}
                preload={near && !dataSaver}
                products={(video.product_ids ?? []).map((id) => productsById.get(id)).filter(Boolean) as PublicProduct[]}
                liked={likedQuery.data?.has(video.id) ?? false}
                saved={savedQuery.data?.has(video.id) ?? false}
                following={followQuery.data?.has(video.business_id) ?? false}
                onToggleMute={() => {
                  setMuted((m) => {
                    const next = !m;
                    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
                    return next;
                  });
                }}
                onTogglePause={() => setPaused((p) => !p)}
                onLike={async () => {
                  if (!requireUser() || !profile) return;
                  const { liked, error } = await toggleVideoLike(profile.id, video.id);
                  if (error) toast.error(error);
                  else {
                    void recordFeedSignal(video.id, "like");
                    toast.success(liked ? "Liked" : "Unliked");
                    void queryClient.invalidateQueries({ queryKey: ["video-likes"] });
                    void queryClient.invalidateQueries({ queryKey: ["video-feed"] });
                  }
                }}
                onSave={async () => {
                  if (!requireUser() || !profile) return;
                  const { saved, error } = await toggleVideoSave(profile.id, video.id);
                  if (error) toast.error(error);
                  else {
                    toast.success(saved ? "Saved" : "Removed");
                    void queryClient.invalidateQueries({ queryKey: ["video-saves"] });
                  }
                }}
                onFollow={async () => {
                  if (!requireUser() || !profile) return;
                  const { following, error } = await toggleFollowBusiness(profile.id, video.business_id);
                  if (error) toast.error(error);
                  else {
                    toast.success(following ? "Following" : "Unfollowed");
                    void queryClient.invalidateQueries({ queryKey: ["video-follows"] });
                    void queryClient.invalidateQueries({ queryKey: ["video-feed"] });
                  }
                }}
                onShare={async () => {
                  const url = `${window.location.origin}/shop?v=${video.id}`;
                  try {
                    if (navigator.share) await navigator.share({ title: video.business_name, url });
                    else {
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied");
                    }
                    void recordFeedSignal(video.id, "share");
                  } catch {
                    /* user cancelled share */
                  }
                }}
                onOpenProducts={() => {
                  setActiveId(video.id);
                  setProductsOpen(true);
                  void recordFeedSignal(video.id, "product_tap");
                }}
                onOpenComments={() => {
                  setActiveId(video.id);
                  setCommentsOpen(true);
                }}
                onMore={() => {
                  setActiveId(video.id);
                  setMoreOpen(true);
                }}
                onEnded={() => void recordFeedSignal(video.id, "complete")}
              />
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={dataSaver}
              onChange={(e) => {
                setDataSaver(e.target.checked);
                localStorage.setItem(DATA_SAVER_KEY, e.target.checked ? "1" : "0");
              }}
            />
            Data saver
          </label>
          <span>Rule-based For You rank · not machine learning</span>
        </div>
      </div>

      <Sheet open={productsOpen} onOpenChange={setProductsOpen}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Products in this video</SheetTitle>
          </SheetHeader>
          {active ? (
            <ProductList
              video={active}
              products={(active.product_ids ?? []).map((id) => productsById.get(id)).filter(Boolean) as PublicProduct[]}
              onAdded={() => {
                void recordFeedSignal(active.id, "add_to_cart");
                void queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Comments</SheetTitle>
          </SheetHeader>
          {active ? <CommentsThread videoId={active.id} /> : null}
        </SheetContent>
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Safety</SheetTitle>
          </SheetHeader>
          {active ? (
            <div className="mt-4 grid gap-2">
              <Button
                variant="outline"
                className="justify-start rounded-xl"
                onClick={async () => {
                  if (!requireUser() || !profile) return;
                  const { error } = await reportVideo({
                    reporterId: profile.id,
                    videoId: active.id,
                    businessId: active.business_id,
                    reason: "spam",
                  });
                  if (error) toast.error(error);
                  else toast.success("Report sent to admins");
                  setMoreOpen(false);
                }}
              >
                <Flag className="mr-2 size-4" /> Report video
              </Button>
              <Button
                variant="outline"
                className="justify-start rounded-xl"
                onClick={async () => {
                  if (!requireUser() || !profile) return;
                  const { error } = await muteProfile(profile.id, active.profile_id);
                  if (error) toast.error(error);
                  else toast.success("Creator muted in For You");
                  setMoreOpen(false);
                  void queryClient.invalidateQueries({ queryKey: ["video-feed"] });
                }}
              >
                Mute creator
              </Button>
              <Button
                variant="outline"
                className="justify-start rounded-xl"
                onClick={async () => {
                  if (!requireUser() || !profile) return;
                  const { error } = await blockProfile(profile.id, active.profile_id);
                  if (error) toast.error(error);
                  else toast.success("Account blocked");
                  setMoreOpen(false);
                  void queryClient.invalidateQueries({ queryKey: ["video-feed"] });
                }}
              >
                Block account
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </MarketplaceShell>
  );
}

function VideoSlide({
  video,
  active,
  muted,
  paused,
  preload,
  products,
  liked,
  saved,
  following,
  onToggleMute,
  onTogglePause,
  onLike,
  onSave,
  onFollow,
  onShare,
  onOpenProducts,
  onOpenComments,
  onMore,
  onEnded,
}: {
  video: PublicFeedVideo;
  active: boolean;
  muted: boolean;
  paused: boolean;
  preload: boolean;
  products: PublicProduct[];
  liked: boolean;
  saved: boolean;
  following: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onShare: () => void;
  onOpenProducts: () => void;
  onOpenComments: () => void;
  onMore: () => void;
  onEnded: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = resolveVideoSrc(video);
  const poster = resolveCoverSrc(video.cover_path) ?? undefined;
  const primary = products[0];
  const available = primary?.is_available !== false && primary?.sale_price != null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active && !paused) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [active, paused, muted]);

  return (
    <article
      data-video-id={video.id}
      className="relative h-full w-full snap-start snap-always overflow-hidden bg-zinc-950"
    >
      {preload || active ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={ref}
          className="h-full w-full object-cover"
          playsInline
          loop
          muted={muted}
          poster={poster}
          preload={active ? "auto" : "metadata"}
          onEnded={onEnded}
          aria-label={`Video from ${video.business_name}`}
        >
          <source src={src} />
          {video.captions_url ? (
            <track kind="captions" src={video.captions_url} srcLang="en" label="Captions" default />
          ) : null}
        </video>
      ) : (
        <div
          className="h-full w-full bg-zinc-900 bg-cover bg-center"
          style={poster ? { backgroundImage: `url(${poster})` } : undefined}
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      <button
        type="button"
        className="absolute inset-0 z-10"
        aria-label={paused || !active ? "Play video" : "Pause video"}
        onClick={onTogglePause}
      />

      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          {attributionLabel(video.attribution)}
        </span>
        {paused ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
            <Pause className="size-3" /> Paused
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
            <Play className="size-3" /> Playing
          </span>
        )}
      </div>

      <div className="absolute bottom-4 left-3 right-16 z-20 space-y-3 text-white">
        <Link to="/b/$slug" params={{ slug: video.slug }} className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-bold">
            {video.business_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.business_logo_url} alt="" className="size-full object-cover" />
            ) : (
              video.business_name.slice(0, 1)
            )}
          </span>
          <span>
            <span className="flex items-center gap-1 font-extrabold">
              {video.business_name}
              {video.is_verified ? (
                <BadgeCheck className="size-4 text-sky-300" aria-label="Verified business" />
              ) : null}
            </span>
            <span className="text-[11px] text-white/75">{video.category_name ?? "Shop"}</span>
          </span>
        </Link>
        {video.is_verified ? (
          <Link to="/b/$slug" params={{ slug: video.slug }} hash="verification" className="block text-[11px] text-sky-200 underline">
            Verification details
          </Link>
        ) : null}
        {video.caption ? <p className="line-clamp-3 text-sm">{video.caption}</p> : null}

        {primary ? (
          <button
            type="button"
            onClick={onOpenProducts}
            className="pointer-events-auto flex w-full items-center gap-2 rounded-2xl bg-white/95 p-2 text-left text-foreground shadow"
          >
            <div className="size-12 overflow-hidden rounded-xl bg-muted">
              {primary.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primary.image_url} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{primary.name}</p>
              <p className="text-xs font-bold text-primary">
                {primary.sale_price != null ? formatNgn(Number(primary.sale_price)) : "Price on request"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {available ? "Available" : "Unavailable"}
                {products.length > 1 ? ` · ${products.length} products` : ""}
              </p>
            </div>
            <span className="text-[11px] font-bold text-primary">View</span>
          </button>
        ) : null}
      </div>

      <div className="absolute bottom-4 right-2 z-20 flex flex-col items-center gap-3 text-white">
        <IconAction label={liked ? "Unlike" : "Like"} onClick={onLike}>
          <Heart className={cn("size-6", liked && "fill-red-500 text-red-500")} />
          <span className="text-[10px] font-bold">{video.like_count}</span>
        </IconAction>
        <IconAction label="Comments" onClick={onOpenComments}>
          <MessageCircle className="size-6" />
          <span className="text-[10px] font-bold">{video.comment_count}</span>
        </IconAction>
        <IconAction label={saved ? "Unsave" : "Save"} onClick={onSave}>
          <Bookmark className={cn("size-6", saved && "fill-white")} />
        </IconAction>
        <IconAction label="Share" onClick={onShare}>
          <Share2 className="size-6" />
        </IconAction>
        <IconAction label={muted ? "Unmute" : "Mute"} onClick={onToggleMute}>
          {muted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
        </IconAction>
        <Button
          size="sm"
          className="pointer-events-auto h-8 rounded-full px-2 text-[10px] font-bold"
          variant={following ? "secondary" : "default"}
          onClick={onFollow}
        >
          {following ? "Following" : "Follow"}
        </Button>
        <button type="button" className="pointer-events-auto text-[10px] font-bold" onClick={onMore}>
          More
        </button>
      </div>
    </article>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="pointer-events-auto flex flex-col items-center gap-0.5"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ProductList({
  video,
  products,
  onAdded,
}: {
  video: PublicFeedVideo;
  products: PublicProduct[];
  onAdded: () => void;
}) {
  const { profile, session } = useAuth();
  const navigate = useNavigate();

  if (products.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">No live products tagged on this post.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {products.map((product) => (
        <li key={product.id} className="flex gap-3 rounded-2xl border border-border p-3">
          <div className="size-16 overflow-hidden rounded-xl bg-muted">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{product.name}</p>
            <p className="text-sm font-bold text-primary">
              {product.sale_price != null ? formatNgn(Number(product.sale_price)) : "No price"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {product.is_available === false ? "Unavailable" : "Available"} · live catalogue
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" className="rounded-lg" asChild>
                <Link to="/shop/p/$productId" params={{ productId: product.id }}>
                  View product
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={product.sale_price == null || product.is_available === false}
                onClick={async () => {
                  if (!session || !profile) {
                    void navigate({ to: "/login" });
                    return;
                  }
                  const { error } = await addToCart(profile.id, {
                    businessId: product.business_id,
                    productId: product.id,
                    productName: product.name,
                    unit: product.unit,
                    unitPrice: Number(product.sale_price),
                    imageUrl: product.image_url,
                  });
                  if (error) toast.error(error);
                  else {
                    toast.success("Added to cart");
                    onAdded();
                  }
                }}
              >
                Add to cart
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={async () => {
                  if (!session || !profile) {
                    void navigate({ to: "/login" });
                    return;
                  }
                  const { error } = await toggleFavoriteProduct(profile.id, product.id);
                  if (error) toast.error(error);
                  else toast.success("Saved to favourites");
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </li>
      ))}
      <li>
        <Button variant="ghost" className="w-full rounded-xl" asChild>
          <Link to="/b/$slug" params={{ slug: video.slug }}>
            Visit {video.business_name}
          </Link>
        </Button>
      </li>
    </ul>
  );
}

function CommentsThread({ videoId }: { videoId: string }) {
  const { profile, session } = useAuth();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const commentsQuery = useQuery({
    queryKey: ["video-comments", videoId],
    queryFn: async () => {
      const r = await fetchVideoComments(videoId);
      if (r.error) throw new Error(r.error);
      return r.comments;
    },
  });
  const comments = commentsQuery.data ?? [];
  const roots = comments.filter((c) => !c.parent_id);

  return (
    <div className="mt-4">
      <ul className="space-y-3">
        {roots.map((c) => (
          <li key={c.id}>
            <p className="text-sm">
              <span className="font-bold">{c.author_name}</span> {c.body}
            </p>
            <button type="button" className="text-[11px] font-bold text-primary" onClick={() => setReplyTo(c.id)}>
              Reply
            </button>
            <ul className="mt-1 space-y-1 border-l pl-3">
              {comments
                .filter((r) => r.parent_id === c.id)
                .map((r) => (
                  <li key={r.id} className="text-sm">
                    <span className="font-bold">{r.author_name}</span> {r.body}
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!session || !profile) return;
          const { error } = await postVideoComment({
            profileId: profile.id,
            videoId,
            body,
            parentId: replyTo,
          });
          if (error) toast.error(error);
          else {
            setBody("");
            setReplyTo(null);
            void queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] });
          }
        }}
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={replyTo ? "Write a reply…" : "Add a comment"}
          className="rounded-xl"
        />
        <Button type="submit" className="rounded-xl">
          Send
        </Button>
      </form>
    </div>
  );
}
