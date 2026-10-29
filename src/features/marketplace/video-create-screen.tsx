"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { SellerVideoStudioScreen } from "@/features/videos/seller-video-studio-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { canUseBusinessMode } from "@/lib/account-mode";
import { fetchCart } from "@/services/marketplace-service";

export function VideoCreateScreen() {
  const { profile, session } = useAuth();
  const businessQuery = usePrimaryBusiness(profile?.id);
  const business = businessQuery.data?.business ?? null;
  const allowed = Boolean(session && profile && canUseBusinessMode(profile) && business);

  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });
  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;

  return (
    <MarketplaceShell cartCount={cartCount}>
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

      {allowed && profile && business && (
        <SellerVideoStudioScreen businessId={business.id} profileId={profile.id} />
      )}
    </MarketplaceShell>
  );
}
