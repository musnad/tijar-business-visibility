"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { MarketingStudioScreen } from "@/features/videos/marketing-studio-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { canUseBusinessMode } from "@/lib/account-mode";

export function ShopStudioScreen() {
  const { profile, session } = useAuth();
  const businessQuery = usePrimaryBusiness(profile?.id);
  const business = businessQuery.data?.business ?? null;
  const canSell = Boolean(session && profile && canUseBusinessMode(profile));
  const hasBusinessAccount = Boolean(canSell && business);
  const checking = Boolean(session && profile && canSell && businessQuery.isPending);

  return (
    <MarketplaceShell hideTopBar hideNav={checking || hasBusinessAccount} variant="feed">
      {hasBusinessAccount && profile && business ? (
        <MarketingStudioScreen
          businessId={business.id}
          businessName={business.business_name}
          profileId={profile.id}
          shopChrome
        />
      ) : (
        <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {checking ? (
            <p className="mt-10 text-center text-sm font-semibold text-muted-foreground">Checking your account…</p>
          ) : (
            <div className="mx-auto mt-8 max-w-sm rounded-2xl border p-6 text-center">
              <Store className="mx-auto size-8 text-[#1F7A4D]" />
              <p className="mt-3 text-lg font-extrabold text-[#0B1F4D]">Business account required</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AI Marketing Studio is for shops with a TIJAR business account.
              </p>
              <Button className="mt-4 min-h-11 w-full rounded-xl bg-[#0B1F4D] font-bold" asChild>
                {session ? <Link to="/shop/business-apply">Send a request</Link> : <Link to="/login">Sign in</Link>}
              </Button>
            </div>
          )}
        </div>
      )}
    </MarketplaceShell>
  );
}
