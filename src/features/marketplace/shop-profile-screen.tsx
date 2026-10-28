"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { AccountModeSwitch } from "@/features/marketplace/account-mode-switch";
import { useAuth } from "@/features/auth/auth-context";
import { signOut } from "@/features/auth/auth-service";
import { canUseBusinessMode, isCustomerOnly, profileAccountMode } from "@/lib/account-mode";
import { requestBusinessUpgrade } from "@/services/marketplace-service";

export function ShopProfileScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [bizName, setBizName] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  if (!session || !profile) {
    return (
      <MarketplaceShell>
        <div className="rounded-2xl border border-border bg-white p-6 text-center">
          <p className="font-bold">Sign in to manage your profile</p>
          <Button className="mt-4 rounded-xl font-bold" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </MarketplaceShell>
    );
  }

  const mode = profileAccountMode(profile);

  async function requestUpgrade() {
    if (!bizName.trim()) {
      toast.error("Enter your business name");
      return;
    }
    setBusy(true);
    const { error } = await requestBusinessUpgrade({
      profileId: profile!.id,
      businessName: bizName,
      location,
      phone: profile!.phone ?? undefined,
    });
    setBusy(false);
    if (error) toast.error(error);
    else toast.success("Upgrade request submitted — waiting for admin approval.");
  }

  return (
    <MarketplaceShell>
      <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase text-muted-foreground">Customer profile</p>
        <h1 className="mt-1 text-xl font-extrabold">{profile.full_name || "TIJAR shopper"}</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
        <p className="mt-2 text-xs font-semibold capitalize text-teal-800">Account: {mode}</p>
        <div className="mt-4">
          <AccountModeSwitch />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Button variant="outline" className="justify-start rounded-xl" asChild>
          <Link to="/shop/orders">My orders</Link>
        </Button>
        <Button variant="outline" className="justify-start rounded-xl" asChild>
          <Link to="/shop/favorites">Favorites</Link>
        </Button>
        <Button variant="outline" className="justify-start rounded-xl" asChild>
          <Link to="/translate">Talk AI translator</Link>
        </Button>
        {canUseBusinessMode(profile) && (
          <Button variant="outline" className="justify-start rounded-xl" asChild>
            <Link to="/app">Open business dashboard</Link>
          </Button>
        )}
      </div>

      {(isCustomerOnly(profile) || mode === "customer") && (
        <section className="mt-6 rounded-2xl border border-border bg-white p-4">
          <h2 className="font-extrabold">Upgrade to business</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sell on TIJAR after admin approval. You keep the same login for shopping.
          </p>
          <Input
            className="mt-3"
            placeholder="Business name"
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
          />
          <Input
            className="mt-2"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Button
            type="button"
            className="mt-3 min-h-11 w-full rounded-xl font-bold"
            disabled={busy}
            onClick={() => void requestUpgrade()}
          >
            Request business account
          </Button>
        </section>
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-6 w-full rounded-xl"
        onClick={async () => {
          await signOut();
          await refreshProfile();
          void navigate({ to: "/shop" });
        }}
      >
        Log out
      </Button>
    </MarketplaceShell>
  );
}
