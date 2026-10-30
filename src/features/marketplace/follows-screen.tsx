"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { MOCK_BUSINESS_ID } from "@/features/marketplace/feed-mock";
import { useAuth } from "@/features/auth/auth-context";
import {
  MOCK_PEOPLE,
  listFollowedPeople,
  listPeopleFollowers,
  toggleFollowPersonLocal,
  type SocialPerson,
} from "@/lib/shop-social";
import { cn } from "@/lib/utils";
import { fetchFollowedBusinesses, fetchShopFollowers } from "@/services/marketplace-service";
import { fetchMyBusinessIds } from "@/services/shop-chat-service";
import { toggleFollowBusiness } from "@/services/video-feed-service";

export function FollowsScreen() {
  const { profile, session } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"shops" | "people">("shops");
  const [peopleTick, setPeopleTick] = useState(0);

  const shopsQuery = useQuery({
    queryKey: ["followed-shops", profile?.id ?? "guest"],
    queryFn: async () => {
      const r = await fetchFollowedBusinesses(profile?.id ?? "guest");
      if (r.error) throw new Error(r.error);
      return r.shops;
    },
  });

  const people = listFollowedPeople(profile?.id ?? "guest");
  void peopleTick;
  const suggested = MOCK_PEOPLE.filter((p) => p.id !== profile?.id && !people.some((x) => x.id === p.id));

  return (
    <MarketplaceShell>
      <h1 className="text-xl font-extrabold">Following</h1>
      <p className="mt-1 text-sm text-muted-foreground">Shops and people you follow.</p>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1">
        <button type="button" className={cn("rounded-lg py-2 text-xs font-bold", tab === "shops" ? "bg-card shadow-sm" : "text-muted-foreground")} onClick={() => setTab("shops")}>
          Shops ({shopsQuery.data?.length ?? 0})
        </button>
        <button type="button" className={cn("rounded-lg py-2 text-xs font-bold", tab === "people" ? "bg-card shadow-sm" : "text-muted-foreground")} onClick={() => setTab("people")}>
          People ({people.length})
        </button>
      </div>

      {tab === "shops" ? (
        <>
          {shopsQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
          {!shopsQuery.isLoading && (shopsQuery.data?.length ?? 0) === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed p-6 text-center">
              <p className="font-semibold">You are not following any shops yet</p>
              <Button className="mt-4 rounded-xl" asChild>
                <Link to="/shop/discover">Discover shops</Link>
              </Button>
            </div>
          )}
          <ul className="mt-4 space-y-2">
            {(shopsQuery.data ?? []).map((shop) => (
              <li key={shop.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <Link to="/b/$slug" params={{ slug: shop.slug }} className="min-w-0 flex-1 font-bold">
                  {shop.business_name}
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{shop.category_name}</span>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={async () => {
                    const r = await toggleFollowBusiness(profile?.id ?? "guest", shop.id, profile?.full_name);
                    if (r.error) toast.error(r.error);
                    else {
                      toast.success(r.following ? "Following" : "Unfollowed");
                      void queryClient.invalidateQueries({ queryKey: ["followed-shops"] });
                      void queryClient.invalidateQueries({ queryKey: ["video-follows"] });
                    }
                  }}
                >
                  Following
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {people.map((p) => (
              <PersonRow key={p.id} person={p} following onToggle={() => {
                toggleFollowPersonLocal(profile?.id ?? "guest", p, { name: profile?.full_name });
                setPeopleTick((n) => n + 1);
                toast.success("Unfollowed");
              }} />
            ))}
          </ul>
          {suggested.length > 0 ? (
            <>
              <h2 className="mt-6 text-sm font-extrabold">People to follow</h2>
              <ul className="mt-2 space-y-2">
                {suggested.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    following={false}
                    onToggle={() => {
                      toggleFollowPersonLocal(profile?.id ?? "guest", p, { name: profile?.full_name });
                      setPeopleTick((n) => n + 1);
                      toast.success(`Following ${p.name}`);
                    }}
                  />
                ))}
              </ul>
            </>
          ) : null}
          {!session ? (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link to="/login" className="font-bold text-primary">Sign in</Link> to keep follows on your account.
            </p>
          ) : null}
        </>
      )}
    </MarketplaceShell>
  );
}

export function FollowersScreen() {
  const { profile } = useAuth();
  const bizQuery = useQuery({
    queryKey: ["my-business-ids", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: () => fetchMyBusinessIds(profile!.id),
  });
  const shopId = bizQuery.data?.[0] ?? MOCK_BUSINESS_ID;
  const shopFollowers = useQuery({
    queryKey: ["shop-followers", shopId],
    queryFn: async () => {
      const r = await fetchShopFollowers(shopId);
      if (r.error) throw new Error(r.error);
      return r.people;
    },
  });
  const people = listPeopleFollowers(profile?.id);

  return (
    <MarketplaceShell>
      <h1 className="text-xl font-extrabold">Followers</h1>
      <p className="mt-1 text-sm text-muted-foreground">People who follow you, and shoppers who follow your business.</p>

      <h2 className="mt-5 text-sm font-extrabold">Your shop</h2>
      {shopFollowers.isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
      <ul className="mt-2 space-y-2">
        {(shopFollowers.data ?? []).map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="font-bold">{p.name}</p>
            <p className="text-xs text-muted-foreground">@{p.handle} · follows your shop</p>
          </li>
        ))}
      </ul>
      {(shopFollowers.data?.length ?? 0) === 0 && !shopFollowers.isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">No shop followers yet. Share your storefront.</p>
      ) : null}

      <h2 className="mt-6 text-sm font-extrabold">Following you</h2>
      <ul className="mt-2 space-y-2">
        {people.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="font-bold">{p.name}</p>
            <p className="text-xs text-muted-foreground">@{p.handle}</p>
          </li>
        ))}
      </ul>
      {people.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nobody is following your profile yet.</p> : null}
    </MarketplaceShell>
  );
}

function PersonRow({ person, following, onToggle }: { person: SocialPerson; following: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-xs font-extrabold">
        {person.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{person.name}</p>
        <p className="text-xs text-muted-foreground">@{person.handle}</p>
      </div>
      <Button size="sm" className={cn("rounded-full", following && "bg-[#0B1F4D]")} variant={following ? "default" : "outline"} onClick={onToggle}>
        {following ? "Following" : "Follow"}
      </Button>
    </li>
  );
}

