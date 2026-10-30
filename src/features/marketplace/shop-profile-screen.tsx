"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  Building2,
  ChevronRight,
  CircleHelp,
  Heart,
  MapPin,
  Package,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TijarLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { canUseBusinessMode } from "@/lib/account-mode";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { listFollowedPeople, listPeopleFollowers, listShopFollowers } from "@/lib/shop-social";
import { MOCK_BUSINESS_ID } from "@/features/marketplace/feed-mock";
import {
  countFavoriteProducts,
  fetchFollowedBusinesses,
  listAddresses,
} from "@/services/marketplace-service";
import { countUnreadShopChats, fetchMyBusinessIds } from "@/services/shop-chat-service";

function handleFromName(name: string, email: string | null): string {
  const fromEmail = email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") ?? "";
  if (fromEmail) return fromEmail.toLowerCase();
  return name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "tijar";
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <MarketplaceShell hideTopBar variant="feed">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">{children}</div>
    </MarketplaceShell>
  );
}

export function ShopProfileScreen() {
  const { profile, session, loading } = useAuth();

  const favQuery = useQuery({
    queryKey: ["marketplace-fav-count", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => countFavoriteProducts(profile!.id),
  });
  const followsQuery = useQuery({
    queryKey: ["followed-shops", profile?.id ?? "guest"],
    queryFn: async () => {
      const r = await fetchFollowedBusinesses(profile?.id ?? "guest");
      if (r.error) throw new Error(r.error);
      return r.shops;
    },
  });
  const addressQuery = useQuery({
    queryKey: ["customer-addresses", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await listAddresses(profile!.id)).data,
  });
  const unreadQuery = useQuery({
    queryKey: ["shop-inbox-unread", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const ids = await fetchMyBusinessIds(profile!.id);
      return countUnreadShopChats(profile!.id, ids);
    },
  });

  if (loading) {
    return (
      <Frame>
        <ProfileChrome />
        <p className="px-4 pt-8 text-center text-sm text-muted-foreground">Loading profile…</p>
      </Frame>
    );
  }

  const demo = !session || !profile;
  const name = demo ? "Ada Johnson" : profile.full_name?.trim() || "TIJAR member";
  const username = demo ? "adajohnson" : handleFromName(name, profile.email);
  const verified = demo || canUseBusinessMode(profile);
  const followers =
    listPeopleFollowers(profile?.id).length + listShopFollowers(MOCK_BUSINESS_ID).length;
  const following = (followsQuery.data?.length ?? 0) + listFollowedPeople(profile?.id ?? "guest").length;
  const saved = demo ? Math.max(23, favQuery.data ?? 0) : (favQuery.data ?? 0);
  const bio = demo
    ? "Entrepreneur | Sourcing & Supply Specialist | Connecting great products with global opportunities."
    : profile.bio?.trim() || "Tell shops who you are. Your bio is only shown on your profile.";
  const address = addressQuery.data?.find((a) => a.is_default) ?? addressQuery.data?.[0];
  const location = demo
    ? "Lagos, Nigeria"
    : [address?.city, address?.state].filter(Boolean).join(", ") || "Location private";
  const photo = demo ? null : profile.avatar_url;
  const notifBadge = demo ? 3 : unreadQuery.data ?? 0;

  const menu: { to: string; label: string; icon: LucideIcon; badge?: number }[] = [
    ...(canUseBusinessMode(profile)
      ? [{ to: "/shop/studio", label: "AI Marketing Studio", icon: Sparkles }]
      : []),
    { to: "/shop/orders", label: "My Orders", icon: Package },
    { to: "/shop/favorites", label: "Saved Products", icon: Heart },
    { to: "/shop/follows", label: "Following", icon: Building2 },
    { to: "/shop/followers", label: "Followers", icon: UserRound },
    { to: "/shop/notifications", label: "Notifications", icon: Bell, badge: notifBadge },
    { to: "/shop/settings", label: "Settings", icon: Settings },
    { to: "/shop/help", label: "Help", icon: CircleHelp },
  ];

  return (
    <Frame>
      <ProfileChrome />
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <section className="flex items-start gap-3 px-4 pt-2" aria-label="Profile">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="size-[4.75rem] shrink-0 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <span
              className="flex size-[4.75rem] shrink-0 items-center justify-center rounded-full bg-muted text-xl font-extrabold text-[color:var(--brand-navy,#001B3A)]"
              aria-hidden
            >
              {name
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="flex items-center gap-1.5 text-[22px] font-extrabold leading-tight tracking-tight text-[color:var(--brand-navy,#001B3A)]">
              <span className="truncate">{name}</span>
              {verified ? (
                <BadgeCheck className="size-5 shrink-0 fill-primary text-white" aria-label="Verified profile" />
              ) : null}
            </h1>
            <p className="text-[13px] font-medium text-muted-foreground">@{username}</p>
            <div className="mt-2.5 grid grid-cols-3 divide-x divide-border" role="group" aria-label="Profile stats">
              <Stat value={followers} label="Followers" to="/shop/followers" />
              <Stat value={following} label="Following" to="/shop/follows" />
              <Stat value={saved} label="Saved" to="/shop/favorites" />
            </div>
          </div>
        </section>

        <section className="mx-4 mt-4 rounded-2xl border border-border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,40,50,0.04)]">
          <p className="flex items-start gap-2 text-[13px] leading-snug text-foreground">
            <UserRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{bio}</span>
          </p>
          <p className="mt-2.5 flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
            {location}
          </p>
        </section>

        {demo ? (
          <Button className="mx-4 mt-4 min-h-12 w-[calc(100%-2rem)] rounded-full border-2 border-[color:var(--brand-navy,#001B3A)] bg-white font-extrabold text-[color:var(--brand-navy,#001B3A)] hover:bg-muted" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="mx-4 mt-4 min-h-12 w-[calc(100%-2rem)] rounded-full border-2 border-[color:var(--brand-navy,#001B3A)] font-extrabold text-[color:var(--brand-navy,#001B3A)]"
            asChild
          >
            <Link to="/shop/edit-profile">Edit Profile</Link>
          </Button>
        )}

        <nav className="mt-4" aria-label="Account">
          <ul>
            {menu.map((item, index) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.to}
                  style={{ animation: `tijar-row-in 0.35s ease ${index * 45}ms both` }}
                >
                  <Link
                    to={item.to as "/shop/orders"}
                    onClick={() => haptic()}
                    className="flex min-h-[3.25rem] items-center gap-3 px-4 text-[15px] font-semibold text-[color:var(--brand-navy,#001B3A)] transition active:bg-muted/70"
                  >
                    <Icon className="size-5 shrink-0 text-[color:var(--brand-navy,#001B3A)]" strokeWidth={1.75} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-white">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    ) : null}
                    <ChevronRight className="size-5 text-muted-foreground/70" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </Frame>
  );
}

function ProfileChrome() {
  return (
    <header className="shrink-0 px-6 pb-2 pt-[max(0.65rem,env(safe-area-inset-top))] text-center">
      <Link to="/shop" className="inline-block max-w-[160px]" aria-label="TIJAR home">
        <TijarLogo compact className="mx-auto max-w-[160px]" />
      </Link>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        Global · Trusted · Trade
      </p>
    </header>
  );
}

function Stat({ value, label, to }: { value: number; label: string; to?: string }) {
  const inner = (
    <>
      <p className="text-[17px] font-extrabold tabular-nums leading-none text-[color:var(--brand-navy,#001B3A)]">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="px-1 text-center" aria-label={`${value} ${label}`}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="px-1 text-center" aria-label={`${value} ${label}`}>
      {inner}
    </div>
  );
}
