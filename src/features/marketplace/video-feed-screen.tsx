"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ShoppingBag,
  ShoppingCart,
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
  isImagePost,
  resolveCoverSrc,
  resolveVideoSrc,
  toggleFollowBusiness,
  toggleVideoLike,
  toggleVideoSave,
  type PublicFeedVideo,
} from "@/services/video-feed-service";
import type { PublicProduct } from "@/types/database";
import { ensureSavedProduct, likeVideoLocal, listFollowedShopIds, loadUserSocial } from "@/lib/shop-social";
import { useDoubleTap } from "@/lib/use-double-tap";
import { haptic } from "@/lib/haptics";
import { formatNgn } from "@/utils/money";
import { isMockFeedId, MOCK_POSTS, MOCK_PRODUCTS } from "@/features/marketplace/feed-mock";
import { useStartShopChat } from "@/features/marketplace/use-start-shop-chat";

type FeedTab = "foryou" | "following" | "nearby";

const MUTE_KEY = "tijar-feed-muted";
const POSITION_KEY = "tijar-for-you-video-id";
const DATA_SAVER_KEY = "tijar-feed-data-saver";
const EMPTY_VIDEOS: PublicFeedVideo[] = [];
const MOCK_ID_SET = new Set(MOCK_POSTS.map((v) => v.id));

function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CaptionText({ text, light }: { text: string; light?: boolean }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/gu);
  return (
    <p className={cn("mt-1 text-[14px] leading-snug", light ? "text-white/95" : "text-zinc-800")}>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={`${part}-${i}`} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
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
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");
  const [mockLiked, setMockLiked] = useState(() => new Set(loadUserSocial("guest").likedVideos));
  const [mockFollowing, setMockFollowing] = useState(() => new Set(listFollowedShopIds("guest")));
  const [mockCartExtra, setMockCartExtra] = useState(0);

  useEffect(() => {
    const id = profile?.id ?? "guest";
    setMockFollowing(new Set(listFollowedShopIds(id)));
    setMockLiked(new Set(loadUserSocial(id).likedVideos));
  }, [profile?.id]);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const feedQuery = useQuery({
    queryKey: ["video-feed", profile?.id ?? "anon"],
    queryFn: async () => {
      const r = await rankAndLoadFeed(profile?.id ?? null);
      if (r.error) throw new Error(r.error);
      return r.videos;
    },
    staleTime: 5_000,
    refetchOnMount: "always",
  });

  const listingsQuery = useQuery({
    queryKey: ["for-you-listings"],
    queryFn: async () => {
      const r = await fetchMarketplaceProducts(80);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
    staleTime: 20_000,
  });

  const liveVideos = feedQuery.data ?? EMPTY_VIDEOS;
  const videos = useMemo(
    () => [...MOCK_POSTS, ...liveVideos.filter((v) => !MOCK_ID_SET.has(v.id))],
    [liveVideos],
  );
  const liveListings = listingsQuery.data ?? [];
  const productIds = useMemo(
    () => [...new Set(videos.flatMap((v) => v.product_ids ?? []))],
    [videos],
  );
  const restoredRef = useRef(false);

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
    queryKey: ["video-follows", profile?.id ?? "guest"],
    queryFn: async () => fetchMyFollowedBusinessIds(profile?.id ?? "guest"),
  });
  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });

  const productsById = useMemo(() => {
    const m = new Map<string, PublicProduct>();
    for (const p of MOCK_PRODUCTS) m.set(p.id, p);
    for (const p of liveListings) m.set(p.id, p);
    for (const p of productsQuery.data ?? []) m.set(p.id, p);
    return m;
  }, [liveListings, productsQuery.data]);

  const active = videos.find((v) => v.id === activeId) ?? videos[0] ?? null;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    if (restoredRef.current || videos.length === 0) return;
    restoredRef.current = true;
    if (initialVideoId && videos.some((v) => v.id === initialVideoId)) {
      setActiveId(initialVideoId);
      const root = scrollerRef.current;
      const node = root?.querySelector(`[data-video-id="${initialVideoId}"]`) as HTMLElement | null;
      if (root && node) root.scrollTop = node.offsetTop;
      return;
    }
    setActiveId(videos[0]!.id);
  }, [videos, initialVideoId]);

  useEffect(() => {
    if (activeId) sessionStorage.setItem(POSITION_KEY, activeId);
    setPaused(false);
  }, [activeId]);

  const feedTabRef = useRef(feedTab);
  useEffect(() => {
    if (feedTabRef.current === feedTab) return;
    feedTabRef.current = feedTab;
    const root = scrollerRef.current;
    if (root) root.scrollTop = 0;
  }, [feedTab]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = (visible?.target as HTMLElement | undefined)?.dataset.videoId;
        if (id) setActiveId((cur) => (cur === id ? cur : id));
      },
      { root, threshold: [0.35, 0.55, 0.75] },
    );
    root.querySelectorAll("[data-video-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [videos.length, liveListings.length, feedTab]);

  useEffect(() => {
    if (!activeId || activeId.startsWith("listing:") || isMockFeedId(activeId)) return;
    void recordFeedSignal(activeId, "impression");
    void recordFeedSignal(activeId, "view");
  }, [activeId]);

  const cartCount = (cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0) + mockCartExtra;

  function requireUser(): boolean {
    if (!session || !profile) {
      toast.message("Sign in to do that.");
      void navigate({ to: "/login" });
      return false;
    }
    return true;
  }

  const taggedIds = new Set(productIds);
  const mockProductIds = new Set(MOCK_PRODUCTS.map((p) => p.id));
  const extraListings = liveListings.filter((p) => !taggedIds.has(p.id) && !mockProductIds.has(p.id));
  const followed = followQuery.data ?? new Set<string>();
  const showPosts =
    feedTab === "nearby"
      ? []
      : feedTab === "following"
        ? videos.filter((v) => isMockFeedId(v.id) || followed.has(v.business_id))
        : videos;
  const showListings =
    feedTab === "nearby" ? [...MOCK_PRODUCTS, ...liveListings] : feedTab === "foryou" ? extraListings : [];

  return (
    <MarketplaceShell cartCount={cartCount} hideTopBar variant="feed">
      <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden bg-white text-foreground">
        <FeedTopBar tab={feedTab} onTab={setFeedTab} />

        <div
          ref={scrollerRef}
          style={{ WebkitOverflowScrolling: "touch" }}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y [overflow-anchor:none] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {showPosts.map((video, index) => {
            const near = activeId === video.id || showPosts.findIndex((v) => v.id === activeId) === index - 1;
            return (
              <VideoSlide
                key={video.id}
                video={video}
                active={activeId === video.id}
                muted
                paused={paused}
                preload={near || activeId === video.id}
                products={(() => {
                  const tagged = (video.product_ids ?? [])
                    .map((id) => productsById.get(id))
                    .filter(Boolean) as PublicProduct[];
                  if (tagged.length > 0) return tagged;
                  if (isMockFeedId(video.id)) {
                    return (video.product_ids ?? []).map((id) => productsById.get(id)).filter(Boolean) as PublicProduct[];
                  }
                  return liveListings.filter((p) => p.business_id === video.business_id);
                })()}
                liked={
                  isMockFeedId(video.id)
                    ? mockLiked.has(video.id)
                    : (likedQuery.data?.has(video.id) ?? mockLiked.has(video.id))
                }
                saved={savedQuery.data?.has(video.id) ?? false}
                following={followQuery.data?.has(video.business_id) || mockFollowing.has(video.business_id)}
                onToggleMute={() => {
                  setMuted((m) => {
                    const next = !m;
                    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
                    return next;
                  });
                }}
                onTogglePause={() => setPaused((p) => !p)}
                onLike={async () => {
                  haptic();
                  const actor = profile?.id ?? "guest";
                  if (isMockFeedId(video.id)) {
                    const liked = likeVideoLocal(actor, video.id);
                    setMockLiked((prev) => new Set(prev).add(video.id));
                    toast.success(liked ? "Liked" : "Liked");
                    return;
                  }
                  const { liked, error } = await toggleVideoLike(actor, video.id);
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
                  haptic("success");
                  const { following, error } = await toggleFollowBusiness(
                    profile?.id ?? "guest",
                    video.business_id,
                    profile?.full_name,
                  );
                  if (error) toast.error(error);
                  else {
                    setMockFollowing((prev) => {
                      const copy = new Set(prev);
                      if (following) copy.add(video.business_id);
                      else copy.delete(video.business_id);
                      return copy;
                    });
                    toast.success(following ? `Following ${video.business_name}` : "Unfollowed");
                    void queryClient.invalidateQueries({ queryKey: ["video-follows"] });
                    void queryClient.invalidateQueries({ queryKey: ["followed-shops"] });
                    void queryClient.invalidateQueries({ queryKey: ["shop-followers"] });
                    void queryClient.invalidateQueries({ queryKey: ["video-feed"] });
                  }
                }}
                onShare={async () => {
                  haptic();
                  const url = `${window.location.origin}/shop?v=${video.id}`;
                  try {
                    if (navigator.share) await navigator.share({ title: video.business_name, url });
                    else {
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied");
                    }
                    if (!isMockFeedId(video.id)) void recordFeedSignal(video.id, "share");
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
                  haptic();
                  setActiveId(video.id);
                  setCommentsOpen(true);
                }}
                onMore={() => {
                  setActiveId(video.id);
                  setMoreOpen(true);
                }}
                onEnded={() => {
                  if (!isMockFeedId(video.id)) void recordFeedSignal(video.id, "complete");
                }}
                onAddToCart={async (product) => {
                  haptic("success");
                  ensureSavedProduct(profile?.id ?? "guest", product);
                  if (isMockFeedId(product.id) || !profile) {
                    setMockCartExtra((n) => n + 1);
                    toast.success("Saved to Saved Products");
                    void queryClient.invalidateQueries({ queryKey: ["marketplace-favorites"] });
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
                    toast.success("Added to cart and Saved Products");
                    void queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
                    void queryClient.invalidateQueries({ queryKey: ["marketplace-favorites"] });
                    if (!isMockFeedId(video.id)) void recordFeedSignal(video.id, "add_to_cart");
                  }
                }}
              />
            );
          })}
          {showListings.map((product) => (
            <ListingSlide
              key={product.id}
              product={product}
              following={followQuery.data?.has(product.business_id) || mockFollowing.has(product.business_id)}
              onFollow={async () => {
                haptic("success");
                const { following, error } = await toggleFollowBusiness(
                  profile?.id ?? "guest",
                  product.business_id,
                  profile?.full_name,
                );
                if (error) toast.error(error);
                else {
                  setMockFollowing((prev) => {
                    const copy = new Set(prev);
                    if (following) copy.add(product.business_id);
                    else copy.delete(product.business_id);
                    return copy;
                  });
                  toast.success(following ? `Following ${product.business_name}` : "Unfollowed");
                  void queryClient.invalidateQueries({ queryKey: ["video-follows"] });
                }
              }}
              onAdd={async () => {
                haptic("success");
                ensureSavedProduct(profile?.id ?? "guest", product);
                if (isMockFeedId(product.id) || !profile) {
                  setMockCartExtra((n) => n + 1);
                  toast.success("Saved to Saved Products");
                  void queryClient.invalidateQueries({ queryKey: ["marketplace-favorites"] });
                  return;
                }
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
                  toast.success("Added to cart and Saved Products");
                  void queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
                  void queryClient.invalidateQueries({ queryKey: ["marketplace-favorites"] });
                }
              }}
            />
          ))}
          {!feedQuery.isLoading && showPosts.length === 0 && showListings.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <ShoppingBag className="size-10 text-primary/40" />
              <p className="font-extrabold text-foreground">
                {feedTab === "following" ? "Follow a shop to see their posts" : "Nothing live yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {feedTab === "nearby"
                  ? "Open Nearby to find shops around you."
                  : "When a shop posts a photo or video, it appears here."}
              </p>
              <Button asChild className="min-h-11 rounded-full bg-primary font-bold hover:bg-primary/90">
                <Link to={feedTab === "nearby" ? "/shop/nearby" : "/shop/discover"}>
                  {feedTab === "nearby" ? "Open map" : "Open Explore"}
                </Link>
              </Button>
            </div>
          )}
          <div className="h-6 shrink-0" aria-hidden />
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
              products={(active.product_ids ?? [])
                .map((id) => productsById.get(id))
                .filter(Boolean) as PublicProduct[]}
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

function FeedTopBar({ tab, onTab }: { tab: FeedTab; onTab: (t: FeedTab) => void }) {
  const { profile, session } = useAuth();
  const tabs: { id: FeedTab; label: string }[] = [
    { id: "foryou", label: "For You" },
    { id: "following", label: "Following" },
    { id: "nearby", label: "Nearby" },
  ];
  const name = profile?.full_name ?? "";
  const initials = name
    ? name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <header className="shrink-0 border-b border-border bg-white pt-[max(0.4rem,env(safe-area-inset-top))]">
      <div className="flex min-h-12 items-center gap-1 px-3 py-1.5">
        <Link to="/shop" className="flex min-w-0 flex-1 flex-col justify-center">
          <TijarLogo compact className="h-8 max-w-[148px] object-left" />
          <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-primary">
            Social Marketplace
          </p>
        </Link>
        <Link
          to="/shop/favorites"
          aria-label="Saved"
          className="flex size-11 min-h-11 min-w-11 items-center justify-center text-foreground"
        >
          <Heart className="size-5" />
        </Link>
        <Link
          to="/shop/notifications"
          aria-label="Notifications"
          className="flex size-11 min-h-11 min-w-11 items-center justify-center text-foreground"
        >
          <Bell className="size-5" />
        </Link>
        <Link
          to={session ? "/shop/profile" : "/login"}
          aria-label="Profile"
          className="flex size-9 min-h-9 min-w-9 items-center justify-center overflow-hidden rounded-full bg-[color:var(--brand-navy,#001B3A)] text-[10px] font-bold text-white"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            initials || "?"
          )}
        </Link>
      </div>
      <nav className="grid grid-cols-3" aria-label="Feed">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                haptic();
                onTab(item.id);
              }}
              className={cn(
                "relative flex min-h-11 items-center justify-center px-2 text-[14px]",
                active ? "font-extrabold text-primary" : "font-semibold text-muted-foreground",
              )}
            >
              {item.label}
              {active ? <span className="absolute inset-x-8 bottom-0 h-[3px] rounded-full bg-primary" /> : null}
            </button>
          );
        })}
      </nav>
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
  following,
  onTogglePause,
  onLike,
  onFollow,
  onShare,
  onOpenProducts,
  onOpenComments,
  onMore,
  onEnded,
  onAddToCart,
}: {
  video: PublicFeedVideo;
  active: boolean;
  muted: boolean;
  paused: boolean;
  preload: boolean;
  products: PublicProduct[];
  liked: boolean;
  saved?: boolean;
  following: boolean;
  onToggleMute?: () => void;
  onTogglePause: () => void;
  onLike: () => void;
  onSave?: () => void;
  onFollow: () => void;
  onShare: () => void;
  onOpenProducts: () => void;
  onOpenComments: () => void;
  onMore: () => void;
  onEnded: () => void;
  onAddToCart: (product: PublicProduct) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = resolveVideoSrc(video);
  const poster = resolveCoverSrc(video.cover_path) ?? undefined;
  const image = isImagePost(video);

  useEffect(() => {
    const el = ref.current;
    if (!el || image) return;
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.loop = true;
    if (active && !paused) {
      const play = () => {
        const attempt = el.play();
        if (attempt) void attempt.catch(() => {
          el.muted = true;
          void el.play().catch(() => undefined);
        });
      };
      if (el.readyState >= 2) play();
      else el.addEventListener("canplay", play, { once: true });
      return () => el.removeEventListener("canplay", play);
    }
    el.pause();
  }, [active, paused, muted, image, src]);

  const featured = products[0] ?? null;
  const when = timeAgo(video.published_at ?? video.created_at);
  const place = video.category_name;
  const [burst, setBurst] = useState(false);
  const onMediaTap = useDoubleTap(
    () => {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 650);
      onLike();
    },
    image ? undefined : onTogglePause,
  );

  const likes = video.like_count + (liked && isMockFeedId(video.id) ? 1 : 0);

  return (
    <article
      data-video-id={video.id}
      className="w-full shrink-0 border-b border-border bg-white pb-3"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {isMockFeedId(video.id) ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SellerAvatar video={video} />
            <SellerMeta name={video.business_name} verified={video.is_verified} when={when} place={place} />
          </div>
        ) : (
          <Link to="/b/$slug" params={{ slug: video.slug }} className="flex min-w-0 flex-1 items-center gap-2">
            <SellerAvatar video={video} />
            <SellerMeta name={video.business_name} verified={video.is_verified} when={when} place={place} />
          </Link>
        )}
        <button
          type="button"
          onClick={onFollow}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-extrabold",
            following ? "border border-border bg-white text-foreground" : "bg-primary text-white",
          )}
        >
          {following ? "Following" : "+ Follow"}
        </button>
        <button
          type="button"
          onClick={onMore}
          aria-label="More"
          className="flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center text-muted-foreground"
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster || src} alt="" className="h-full w-full object-cover" />
        ) : preload || active ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={ref}
            className="h-full w-full object-cover"
            src={src}
            poster={poster}
            autoPlay
            muted
            playsInline
            loop
            preload={active ? "auto" : "metadata"}
            onCanPlay={() => {
              if (active && !paused) void ref.current?.play().catch(() => undefined);
            }}
            onEnded={onEnded}
            aria-label={`Video from ${video.business_name}`}
          >
            {video.captions_url ? (
              <track kind="captions" src={video.captions_url} srcLang="en" label="Captions" default />
            ) : null}
          </video>
        ) : (
          <div
            className="h-full w-full bg-zinc-200 bg-cover bg-center"
            style={poster ? { backgroundImage: `url(${poster})` } : undefined}
          />
        )}
        <button
          type="button"
          className="absolute inset-0"
          aria-label="Double tap to like"
          onClick={onMediaTap}
        />
        {burst ? (
          <Heart className="pointer-events-none absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 fill-red-500 text-red-500" />
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-1 px-2">
        <div className="flex items-center">
          <IconAction label={liked ? "Unlike" : "Like"} count={compactCount(likes)} onClick={onLike}>
            <Heart className={cn("size-5", liked ? "fill-red-500 text-red-500" : "text-foreground")} />
          </IconAction>
          <IconAction label="Comments" count={compactCount(video.comment_count)} onClick={onOpenComments}>
            <MessageCircle className="size-5 text-foreground" />
          </IconAction>
          <IconAction label="Share" count={compactCount(Math.max(video.view_count, 0))} onClick={onShare}>
            <Share2 className="size-5 text-foreground" />
          </IconAction>
        </div>
        {featured ? (
          <IconAction label="Add to cart" onClick={() => onAddToCart(featured)}>
            <ShoppingCart className="size-5 text-foreground" />
          </IconAction>
        ) : null}
      </div>

      {video.caption ? (
        <div className="shrink-0 px-3 pb-1">
          <CaptionText text={video.caption} />
        </div>
      ) : null}

      <div className="shrink-0 px-3 pb-3 pt-1">
        {featured ? (
          <FeedProductCard product={featured} onAdd={() => onAddToCart(featured)} />
        ) : (
          <button
            type="button"
            onClick={onOpenProducts}
            className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-border text-sm font-extrabold text-primary"
          >
            Shop the look
          </button>
        )}
      </div>
    </article>
  );
}

function SellerAvatar({ video }: { video: PublicFeedVideo }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--brand-navy,#001B3A)] text-sm font-extrabold text-white ring-1 ring-border">
      {video.business_logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.business_logo_url} alt="" className="size-full object-cover" />
      ) : (
        video.business_name.slice(0, 1)
      )}
    </span>
  );
}

function SellerMeta({
  name,
  verified,
  when,
  place,
}: {
  name: string;
  verified: boolean;
  when: string;
  place: string | null;
}) {
  return (
    <span className="min-w-0">
      <span className="flex items-center gap-1 truncate text-[15px] font-extrabold text-foreground">
        {name}
        {verified ? <BadgeCheck className="size-4 shrink-0 fill-primary text-white" aria-label="Verified" /> : null}
      </span>
      <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
        {when || "Just now"}
        {place ? (
          <>
            <span aria-hidden>·</span>
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{place}</span>
          </>
        ) : null}
      </span>
    </span>
  );
}

function FeedProductCard({ product, onAdd }: { product: PublicProduct; onAdd: () => void }) {
  const navigate = useNavigate();
  const startChat = useStartShopChat();
  const summary = variantSummary(product);
  const inStock = product.is_available !== false;
  const mock = isMockFeedId(product.id);

  const blurb =
    product.kind === "service"
      ? [serviceLabel(product), formatServiceDates(product)].filter(Boolean).join(" · ")
      : summary?.replace(/^Sizes:\s*/, "").replace(/Colour:\s*/, "") ||
        (product.description ? product.description.split(/[.!?]/)[0] : "Elegant · Durable · Timeless");

  function buyNow() {
    haptic("success");
    if (mock) {
      toast.success(
        `Buy now — ${product.name} · ${product.sale_price != null ? formatNgn(Number(product.sale_price)) : ""}`.trim(),
      );
      return;
    }
    void navigate({ to: "/shop/p/$productId", params: { productId: product.id } });
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-2.5 text-zinc-900">
      <div className="flex items-center gap-3">
        <div className="size-[4.25rem] shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[15px] font-extrabold leading-tight">
            <span className="truncate">{product.name}</span>
            {inStock ? (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary">
                New
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{blurb}</p>
          <p className="mt-1 text-lg font-black text-primary">
            {product.sale_price != null ? formatNgn(Number(product.sale_price)) : "Ask seller"}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={buyNow}
          className="inline-flex min-h-11 items-center justify-center gap-0.5 rounded-full bg-primary px-3 text-xs font-extrabold text-white"
        >
          Buy now
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            haptic();
            onAdd();
          }}
          disabled={!inStock || product.sale_price == null}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-primary px-3 text-xs font-extrabold text-primary disabled:opacity-50"
        >
          <ShoppingCart className="size-3.5" />
          Add to cart
        </button>
      </div>
      <button
        type="button"
        className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-muted text-xs font-extrabold text-foreground"
        onClick={() =>
          void startChat({
            businessId: product.business_id,
            businessName: product.business_name,
            logoUrl: product.business_logo_url,
            businessSlug: product.business_slug,
            productId: mock ? null : product.id,
          })
        }
      >
        <MessageCircle className="size-3.5" />
        Message shop
      </button>
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
  const shop = product.business_name ?? "Shop";
  return (
    <article
      data-video-id={`listing:${product.id}`}
      className="w-full shrink-0 border-b border-border bg-white pb-3"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {slug ? (
          <Link to="/b/$slug" params={{ slug }} className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--brand-navy,#001B3A)] text-sm font-extrabold text-white">
              {product.business_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.business_logo_url} alt="" className="size-full object-cover" />
              ) : (
                shop.slice(0, 1)
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold text-foreground">{shop}</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {timeAgo(product.created_at) || "Just listed"}
                {product.category_name ? (
                  <>
                    <span aria-hidden>·</span>
                    <MapPin className="size-3" />
                    {product.category_name}
                  </>
                ) : null}
              </span>
            </span>
          </Link>
        ) : (
          <span className="min-w-0 flex-1 font-extrabold">{shop}</span>
        )}
        <button
          type="button"
          onClick={onFollow}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-extrabold",
            following ? "border border-border bg-white text-foreground" : "bg-primary text-white",
          )}
        >
          {following ? "Following" : "+ Follow"}
        </button>
      </div>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="size-16" />
          </div>
        )}
      </div>
      {product.description ? (
        <p className="line-clamp-2 shrink-0 px-3 pt-2 text-[14px] text-zinc-800">{product.description}</p>
      ) : null}
      <div className="shrink-0 px-3 pb-3 pt-2">
        <FeedProductCard product={product} onAdd={onAdd} />
      </div>
    </article>
  );
}

function IconAction({
  label,
  count,
  onClick,
  children,
}: {
  label: string;
  count?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 text-foreground"
      aria-label={label}
      onClick={onClick}
    >
      {children}
      {count ? <span className="text-[12px] font-bold tabular-nums">{count}</span> : null}
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
              <Button
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  haptic("success");
                  if (isMockFeedId(product.id)) {
                    toast.success(
                      `Buy now — ${product.name} · ${product.sale_price != null ? formatNgn(Number(product.sale_price)) : ""}`.trim(),
                    );
                    return;
                  }
                  void navigate({ to: "/shop/buy", search: { productId: product.id } });
                }}
              >
                Buy now
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={product.sale_price == null || product.is_available === false}
                onClick={async () => {
                  haptic("success");
                  ensureSavedProduct(profile?.id ?? "guest", product);
                  if (isMockFeedId(product.id) || !session || !profile) {
                    toast.success("Saved to Saved Products");
                    onAdded();
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
                    toast.success("Added to cart and Saved Products");
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
    enabled: !isMockFeedId(videoId),
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
