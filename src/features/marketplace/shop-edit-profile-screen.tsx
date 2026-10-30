"use client";

import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { EditProfileForm } from "@/features/profile/edit-profile-form";
import { useAuth } from "@/features/auth/auth-context";

export function ShopEditProfileScreen() {
  const { profile, session, loading } = useAuth();

  return (
    <MarketplaceShell hideTopBar variant="feed">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-[max(0.5rem,env(safe-area-inset-top))]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Link
          to="/shop/profile"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Profile
        </Link>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-[color:var(--brand-navy,#001B3A)]">
          Edit Profile
        </h1>
        {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
        {!loading && (!session || !profile) && (
          <Button className="mt-6 min-h-11 w-full rounded-full font-bold" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        )}
        {profile && <EditProfileForm profile={profile} afterSave="/shop/profile" />}
      </div>
    </MarketplaceShell>
  );
}
