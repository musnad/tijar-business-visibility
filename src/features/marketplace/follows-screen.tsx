"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { fetchFollowedBusinesses } from "@/services/marketplace-service";

export function FollowsScreen() {
  const { profile, session } = useAuth();
  const query = useQuery({
    queryKey: ["followed-shops", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const r = await fetchFollowedBusinesses(profile!.id);
      if (r.error) throw new Error(r.error);
      return r.shops;
    },
  });

  if (!session) {
    return (
      <MarketplaceShell>
        <p className="text-sm">
          <Link to="/login" className="font-bold text-primary">
            Sign in
          </Link>{" "}
          to see shops you follow.
        </p>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell>
      <h1 className="text-xl font-extrabold">Followed shops</h1>
      {query.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {!query.isLoading && (query.data?.length ?? 0) === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed p-6 text-center">
          <p className="font-semibold">You are not following any shops yet</p>
          <Button className="mt-4 rounded-xl" asChild>
            <Link to="/shop/discover">Discover shops</Link>
          </Button>
        </div>
      )}
      <ul className="mt-4 space-y-2">
        {(query.data ?? []).map((shop) => (
          <li key={shop.id}>
            <Link to="/b/$slug" params={{ slug: shop.slug }} className="block rounded-2xl border border-border bg-card p-4 font-bold">
              {shop.business_name}
              <span className="mt-1 block text-xs font-normal text-muted-foreground">{shop.category_name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </MarketplaceShell>
  );
}
