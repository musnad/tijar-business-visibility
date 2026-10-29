"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  ChevronRight,
  Flag,
  Heart,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Search,
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
import { formatServiceDates, serviceLabel } from "@/lib/catalogue/service-schedule";
import { parseVariantList } from "@/lib/catalogue/variants";
import { TijarLogo } from "@/components/brand-logo";
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

function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function variantSummary(product: PublicProduct): string | null {
  const variants = parseVariantList(product.variants);
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colours = [...new Set(variants.map((v) => v.colour).filter(Boolean))];
  const attrs = product.attributes ?? {};
  if (!sizes.length && attrs.size) sizes.push(attrs.size);
  if (!colours.length && attrs.colour) colours.push(attrs.colour);
  const bits: string[] = [];
  if (sizes.length) bits.push(`Sizes: ${sizes.join(", ")}`);
  if (colours.length) bits.push(`Colour: ${colours.join(", ")}`);
  return bits.length ? bits.join(" · ") : null;
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
    if (!activeId || activeId.startsWith("listing:")) return;
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

  const taggedIds = new Set(productIds);
  const extraListings = liveListings.filter((p) => !taggedIds.has(p.id));

  return (
    <MarketplaceShell cartCount={cartCount} hideTopBar variant="feed">
      <div className="relative mx-auto h-[calc(100dvh-4.25rem)] w-full max-w-lg overflow-hidden bg-black">
        <FeedTopBar />
        {feedQuery.isLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-white/70">Loading For You…</p>
          </div>
        )}
        {feedQuery.isError && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-bold">Could not load the feed</p>
            <Button onClick={() => void feedQuery.refetch()} className="rounded-full bg-[#7C3AED] hover:bg-[#6D28D9]">
              Retry
            </Button>
          </div>
        )}

        <div
          ref={scrollerRef}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
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
                products={(() => {
                  const tagged = (video.product_ids ?? [])
                    .map((id) => productsById.get(id))
                    .filter(Boolean) as PublicProduct[];
                  if (tagged.length > 0) return tagged;
                  return liveListings.filter((p) => p.business_id === video.business_id);
                })()}
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
          {extraListings.map((product) => (
            <ListingSlide
              key={product.id}
              product={product}
              following={followQuery.data?.has(product.business_id) ?? false}
              onFollow={async () => {
                if (!requireUser() || !profile) return;
                const { following, error } = await toggleFollowBusiness(profile.id, product.business_id);
                if (error) toast.error(error);
                else void queryClient.invalidateQueries({ queryKey: ["video-follows"] });
              }}
              onAdd={async () => {
                if (!requireUser() || !profile) return;
                if (product.sale_price == null) return;
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
                  void queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
                }
              }}
            />
          ))}
          {!feedQuery.isLoading && videos.length === 0 && extraListings.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <ShoppingBag className="size-10 text-white/50" />
              <p className="font-extrabold">Nothing live yet</p>
              <p className="text-sm text-white/70">When a shop posts a product or video, it appears here.</p>
              <Button asChild className="rounded-full bg-[#7C3AED] font-bold hover:bg-[#6D28D9]">
                <Link to="/shop/discover">Open Discover</Link>
              </Button>
            </div>
          )}
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

function FeedTopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/shop" as const, label: "For You" },
    { to: "/shop/discover" as const, label: "Discover" },
    { to: "/shop/follows" as const, label: "Following" },
  ];
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-10 pt-[max(0.6rem,env(safe-area-inset-top))]">
      <Link to="/shop" className="pointer-events-auto mt-1 block w-[88px] shrink-0">
        <TijarLogo compact className="brightness-0 invert" />
      </Link>
      <nav className="pointer-events-auto flex items-end gap-4 pt-2 text-[15px] font-semibold text-white/70">
        {tabs.map((tab) => {
          const active = tab.to === "/shop" ? pathname === "/shop" || pathname === "/shop/" : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn("relative pb-1", active && "font-extrabold text-white")}
            >
              {tab.label}
              {active ? <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-[#A855F7]" /> : null}
            </Link>
          );
        })}
      </nav>
      <div className="pointer-events-auto mt-1 flex items-center gap-2">
        <Link to="/shop/discover" aria-label="Search" className="flex size-9 items-center justify-center rounded-full bg-black/25">
          <Search className="size-5" />
        </Link>
        <Link to="/shop/notifications" aria-label="Notifications" className="relative flex size-9 items-center justify-center rounded-full bg-black/25">
          <Bell className="size-5" />
        </Link>
      </div>
    </header>
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

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

      <button
        type="button"
        className="absolute inset-0 z-10"
        aria-label={paused || !active ? "Play video" : "Pause video"}
        onClick={onTogglePause}
      />

      <div className="absolute left-3 right-[4.25rem] top-[4.75rem] z-20 flex items-center gap-2">
        <Link to="/b/$slug" params={{ slug: video.slug }} className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2">
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/90">
            {video.business_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.business_logo_url} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-sm font-extrabold text-white">{video.business_name.slice(0, 1)}</span>
            )}
          </span>
          <span className="min-w-0 text-white">
            <span className="flex items-center gap-1 truncate text-sm font-extrabold">
              {video.business_name}
              {video.is_verified ? <BadgeCheck className="size-4 shrink-0 fill-[#7C3AED] text-white" aria-label="Verified" /> : null}
            </span>
            <span className="block truncate text-[11px] text-white/80">
              {video.is_verified ? "Verified Business" : "Business"}
              {video.category_name ? ` · ${video.category_name}` : ""}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onFollow}
          className={cn(
            "pointer-events-auto shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold",
            following ? "bg-white/20 text-white" : "bg-[#7C3AED] text-white",
          )}
        >
          {following ? "Following" : "Follow"}
        </button>
      </div>

      <div className="absolute bottom-3 left-3 right-[4.35rem] z-20 space-y-2">
        {products.length > 0 ? (
          <ul className="pointer-events-auto flex snap-x gap-2 overflow-x-auto pb-1">
            {products.map((product) => (
              <li key={product.id} className="w-[min(100%,20.5rem)] shrink-0 snap-start">
                <FeedProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={onOpenProducts}
            className="pointer-events-auto rounded-full bg-[#7C3AED] px-3 py-1.5 text-xs font-extrabold text-white"
          >
            Shop the look
          </button>
        )}

        <div className="text-white">
          <Link to="/b/$slug" params={{ slug: video.slug }} className="pointer-events-auto inline-flex items-center gap-1 text-sm font-extrabold">
            {video.business_name}
            {video.is_verified ? <BadgeCheck className="size-4 fill-[#7C3AED] text-white" /> : null}
          </Link>
          {video.caption ? <p className="mt-0.5 line-clamp-3 text-[13px] leading-snug text-white/95">{video.caption}</p> : null}
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/75">
            <Music2 className="size-3" /> Original Sound · {video.business_name}
          </p>
        </div>
      </div>

      <div className="absolute bottom-4 right-2 z-20 flex flex-col items-center gap-3.5 text-white">
        <button type="button" onClick={onFollow} className="pointer-events-auto relative" aria-label="Follow shop">
          <span className="flex size-12 items-center justify-center overflow-hidden rounded-full ring-2 ring-white">
            {video.business_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.business_logo_url} alt="" className="size-full object-cover" />
            ) : (
              video.business_name.slice(0, 1)
            )}
          </span>
          <span className="absolute -bottom-1 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full bg-[#7C3AED] text-sm font-bold leading-none">
            +
          </span>
        </button>
        <IconAction label={liked ? "Unlike" : "Like"} onClick={onLike}>
          <Heart className={cn("size-8 drop-shadow", liked && "fill-red-500 text-red-500")} />
          <span className="text-[11px] font-bold">{compactCount(video.like_count)}</span>
        </IconAction>
        <IconAction label="Comments" onClick={onOpenComments}>
          <MessageCircle className="size-8 drop-shadow" />
          <span className="text-[11px] font-bold">{compactCount(video.comment_count)}</span>
        </IconAction>
        <IconAction label="Share" onClick={onShare}>
          <Share2 className="size-8 drop-shadow" />
          <span className="text-[11px] font-bold">{compactCount(Math.max(video.view_count, 0))}</span>
        </IconAction>
        <IconAction label={saved ? "Unsave" : "Save"} onClick={onSave}>
          <Bookmark className={cn("size-8 drop-shadow", saved && "fill-white")} />
          <span className="text-[11px] font-bold">{compactCount(video.save_count)}</span>
        </IconAction>
        <IconAction label={muted ? "Unmute" : "Mute"} onClick={onToggleMute}>
          {muted ? <VolumeX className="size-6 drop-shadow" /> : <Volume2 className="size-6 drop-shadow" />}
        </IconAction>
        <button type="button" className="pointer-events-auto text-[10px] font-bold opacity-80" onClick={onMore}>
          {paused ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>
    </article>
  );
}

function FeedProductCard({ product }: { product: PublicProduct }) {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const summary = variantSummary(product);
  const inStock = product.is_available !== false;

  async function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session || !profile) {
      void navigate({ to: "/login" });
      return;
    }
    if (product.sale_price == null) {
      toast.message("This listing has no price yet.");
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
      void queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
    }
  }

  return (
    <div className="rounded-2xl bg-white p-2.5 text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
      <div className="flex gap-2.5">
        <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className="truncate text-sm font-extrabold leading-tight">{product.name}</p>
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-zinc-400" />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm font-black text-[#7C3AED]">
            {product.sale_price != null ? formatNgn(Number(product.sale_price)) : "Ask seller"}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                inStock ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800",
              )}
            >
              {inStock ? "In Stock" : "Unavailable"}
            </span>
          </p>
          {summary ? <p className="mt-0.5 truncate text-[10px] text-zinc-500">{summary}</p> : null}
          {product.kind === "service" ? (
            <p className="mt-0.5 truncate text-[10px] font-semibold text-zinc-500">
              {[serviceLabel(product), formatServiceDates(product)].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link
          to="/shop/p/$productId"
          params={{ productId: product.id }}
          className="flex h-9 items-center justify-center rounded-full border border-[#7C3AED] text-xs font-extrabold text-[#7C3AED]"
        >
          View Product
        </Link>
        <button
          type="button"
          onClick={(e) => void add(e)}
          disabled={!inStock || product.sale_price == null}
          className="flex h-9 items-center justify-center rounded-full bg-[#7C3AED] text-xs font-extrabold text-white disabled:opacity-50"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function ListingSlide({
  product,
  following,
  onFollow,
  onAdd,
}: {
  product: PublicProduct;
  following: boolean;
  onFollow: () => void;
  onAdd: () => void;
}) {
  const poster = product.image_url || product.extra_image_urls?.[0] || "";
  const slug = product.business_slug;
  return (
    <article
      data-video-id={`listing:${product.id}`}
      className="relative h-full w-full snap-start snap-always overflow-hidden bg-zinc-950"
    >
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center bg-zinc-900 text-white/40">
          <ShoppingBag className="size-16" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />
      <div className="absolute left-3 right-[4.25rem] top-[4.75rem] z-20 flex items-center gap-2">
        {slug ? (
          <Link to="/b/$slug" params={{ slug }} className="pointer-events-auto min-w-0 flex-1 text-white">
            <span className="block truncate text-sm font-extrabold">{product.business_name ?? "Shop"}</span>
            <span className="text-[11px] text-white/80">{product.category_name ?? "Just listed"}</span>
          </Link>
        ) : (
          <span className="min-w-0 flex-1 text-white">
            <span className="block truncate text-sm font-extrabold">{product.business_name ?? "Shop"}</span>
          </span>
        )}
        <button
          type="button"
          onClick={onFollow}
          className={cn(
            "pointer-events-auto shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold",
            following ? "bg-white/20 text-white" : "bg-[#7C3AED] text-white",
          )}
        >
          {following ? "Following" : "Follow"}
        </button>
      </div>
      <div className="absolute bottom-3 left-3 right-[4.35rem] z-20">
        <FeedProductCard product={product} />
        <p className="mt-2 line-clamp-2 text-[13px] text-white">{product.description}</p>
      </div>
      <div className="absolute bottom-24 right-2 z-20">
        <button
          type="button"
          onClick={onAdd}
          className="pointer-events-auto rounded-full bg-[#7C3AED] px-3 py-2 text-xs font-extrabold text-white shadow-lg"
        >
          Shop the look
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
