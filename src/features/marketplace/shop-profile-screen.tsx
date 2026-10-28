"use client";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  Package,
  Store,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { AccountModeSwitch } from "@/features/marketplace/account-mode-switch";
import { OrderTrackTimeline } from "@/features/marketplace/order-track-timeline";
import { useAuth } from "@/features/auth/auth-context";
import { signOut } from "@/features/auth/auth-service";
import { canUseBusinessMode, isCustomerOnly, profileAccountMode } from "@/lib/account-mode";
import {
  countFavoriteProducts,
  fetchCart,
  fetchMyOrders,
  requestBusinessUpgrade,
} from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";
import {
  formatOrderWhen,
  isActiveOrder,
  orderStatusLabel,
  orderStatusTone,
} from "@/utils/order-tracking";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: string): string {
  const tone = orderStatusTone(status);
  if (tone === "active") return "bg-primary/15 text-primary";
  if (tone === "done") return "bg-emerald-100 text-emerald-800";
  if (tone === "warn") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

export function ShopProfileScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [bizName, setBizName] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["marketplace-orders"],
    enabled: Boolean(session),
    queryFn: async () => {
      const res = await fetchMyOrders();
      if (res.error) throw new Error(res.error);
      return res.orders;
    },
  });

  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });

  const favCountQuery = useQuery({
    queryKey: ["marketplace-fav-count", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => countFavoriteProducts(profile!.id),
  });

  if (!session || !profile) {
    return (
      <MarketplaceShell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-bold">Sign in to manage your profile</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Track orders, saved items, and your cart in one place.
          </p>
          <Button className="mt-4 rounded-xl font-bold" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </MarketplaceShell>
    );
  }

  const mode = profileAccountMode(profile);
  const orders = ordersQuery.data ?? [];
  const activeOrders = orders.filter((o) => isActiveOrder(o.status));
  const recent = (activeOrders.length > 0 ? activeOrders : orders).slice(0, 3);
  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;
  const favCount = favCountQuery.data ?? 0;
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "there";

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
      ...(profile!.phone ? { phone: profile!.phone } : {}),
    });
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success("Upgrade request submitted — waiting for admin approval.");
      setShowUpgrade(false);
    }
  }

  return (
    <MarketplaceShell cartCount={cartCount}>
      <section className="dashboard-summary-card rounded-2xl p-5 text-primary-foreground shadow-lg">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">My account</p>
        <h1 className="mt-1 text-xl font-extrabold">Hi {firstName}</h1>
        <p className="mt-1 truncate text-sm text-white/80">{profile.email}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            to="/shop/orders"
            className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm"
          >
            <p className="text-lg font-extrabold tabular-nums">{activeOrders.length}</p>
            <p className="text-[10px] font-semibold text-white/80">Active</p>
          </Link>
          <Link
            to="/shop/orders"
            className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm"
          >
            <p className="text-lg font-extrabold tabular-nums">{orders.length}</p>
            <p className="text-[10px] font-semibold text-white/80">Orders</p>
          </Link>
          <Link
            to="/shop/favorites"
            className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm"
          >
            <p className="text-lg font-extrabold tabular-nums">{favCount}</p>
            <p className="text-[10px] font-semibold text-white/80">Saved</p>
          </Link>
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold">Track your orders</h2>
          <Link to="/shop/orders" className="text-xs font-bold text-primary">
            See all
          </Link>
        </div>

        {ordersQuery.isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">Loading orders…</p>
        )}

        {!ordersQuery.isLoading && recent.length === 0 && (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-card p-5 text-center">
            <Package className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 font-semibold">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When you buy something, you can track it here.
            </p>
            <Button className="mt-4 rounded-xl font-bold" asChild>
              <Link to="/shop">Start shopping</Link>
            </Button>
          </div>
        )}

        <ul className="mt-3 space-y-3">
          {recent.map((o) => (
            <li key={o.id}>
              <Link
                to="/shop/orders/$orderId"
                params={{ orderId: o.id }}
                className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{formatOrderWhen(o.created_at)}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      statusBadgeClass(o.status),
                    )}
                  >
                    {orderStatusLabel(o.status)}
                  </span>
                </div>
                <OrderTrackTimeline status={o.status} fulfilment={o.fulfilment} compact />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-primary">
                    {formatNgn(Number(o.total))}
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-primary">
                    Track <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-2">
        <Link
          to="/shop/orders"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-5" />
          </span>
          <span>
            <p className="text-sm font-bold">Orders</p>
            <p className="text-[11px] text-muted-foreground">History & status</p>
          </span>
        </Link>
        <Link
          to="/shop/cart"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingCart className="size-5" />
          </span>
          <span>
            <p className="text-sm font-bold">Cart</p>
            <p className="text-[11px] text-muted-foreground">
              {cartCount > 0 ? `${cartCount} items` : "Empty"}
            </p>
          </span>
        </Link>
        <Link
          to="/shop/favorites"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="size-5" />
          </span>
          <span>
            <p className="text-sm font-bold">Saved</p>
            <p className="text-[11px] text-muted-foreground">
              {favCount > 0 ? `${favCount} items` : "Favorites"}
            </p>
          </span>
        </Link>
        <Link
          to="/shop/nearby"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="size-5" />
          </span>
          <span>
            <p className="text-sm font-bold">Near me</p>
            <p className="text-[11px] text-muted-foreground">Map & buy</p>
          </span>
        </Link>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold">Account mode</p>
            <p className="text-xs capitalize text-muted-foreground">{mode}</p>
          </div>
          <AccountModeSwitch />
        </div>
        {canUseBusinessMode(profile) && (
          <Button variant="outline" className="mt-3 w-full justify-start rounded-xl" asChild>
            <Link to="/app">
              <Store className="mr-2 size-4" /> Open business dashboard
            </Link>
          </Button>
        )}
      </section>

      {(isCustomerOnly(profile) || mode === "customer") && !canUseBusinessMode(profile) && (
        <section className="mt-4">
          {!showUpgrade ? (
            <button
              type="button"
              className="w-full rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-left text-sm"
              onClick={() => setShowUpgrade(true)}
            >
              <span className="font-bold">Want to sell on TIJAR?</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Request a business account — tap to continue
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="font-extrabold">Sell as a business</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Same login for shopping. Admin approval required.
              </p>
              <Input
                className="mt-3 min-h-11 rounded-xl"
                placeholder="Business name"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
              />
              <Input
                className="mt-2 min-h-11 rounded-xl"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 flex-1 rounded-xl"
                  onClick={() => setShowUpgrade(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="min-h-11 flex-1 rounded-xl font-bold"
                  disabled={busy}
                  onClick={() => void requestUpgrade()}
                >
                  Submit
                </Button>
              </div>
            </div>
          )}
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
        <LogOut className="mr-2 size-4" /> Log out
      </Button>
    </MarketplaceShell>
  );
}
