"use client";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Clock3,
  Heart,
  LogOut,
  MapPin,
  Package,
  Store,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { AccountModeSwitch } from "@/features/marketplace/account-mode-switch";
import { OrderTrackTimeline } from "@/features/marketplace/order-track-timeline";
import { useAuth } from "@/features/auth/auth-context";
import { signOut } from "@/features/auth/auth-service";
import { canUseBusinessMode, isCustomerOnly, profileAccountMode } from "@/lib/account-mode";
import { isTijarSuperAdminEmail } from "@/lib/admin";
import {
  countFavoriteProducts,
  fetchCart,
  fetchMyBusinessUpgradeRequest,
  fetchMyOrders,
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

  const upgradeQuery = useQuery({
    queryKey: ["business-upgrade-request", profile?.id],
    enabled: Boolean(profile?.id) && !canUseBusinessMode(profile),
    queryFn: async () => {
      const res = await fetchMyBusinessUpgradeRequest(profile!.id);
      if (res.error) throw new Error(res.error);
      return res.request;
    },
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
  const upgrade = upgradeQuery.data;
  const showBusinessApply =
    (isCustomerOnly(profile) || mode === "customer") && !canUseBusinessMode(profile);

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
          to="/shop/follows"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="size-5" />
          </span>
          <span>
            <p className="text-sm font-bold">Following</p>
            <p className="text-[11px] text-muted-foreground">Shops you follow</p>
          </span>
        </Link>
        <Link
          to="/shop/enquiries"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-5" />
          </span>
          <span>
            <p className="text-sm font-bold">Enquiries</p>
            <p className="text-[11px] text-muted-foreground">Messages sent</p>
          </span>
        </Link>
        <Link
          to="/shop/notifications"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock3 className="size-5" />
          </span>
          <span>
            <p className="text-sm font-bold">Alerts</p>
            <p className="text-[11px] text-muted-foreground">Preferences</p>
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
            <p className="text-xs capitalize text-muted-foreground">
              {mode === "both" ? "Shop + Business" : mode}
            </p>
          </div>
          <AccountModeSwitch />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {canUseBusinessMode(profile)
            ? "Verified businesses can switch to Shop or Business anytime."
            : "Customers request a business account first. Admin approval unlocks the dashboard."}
        </p>
        {canUseBusinessMode(profile) && (
          <Button variant="outline" className="mt-3 w-full justify-start rounded-xl" asChild>
            <Link to="/app">
              <Store className="mr-2 size-4" /> Open business dashboard
            </Link>
          </Button>
        )}
        {isTijarSuperAdminEmail(profile.email) && (
          <Button variant="outline" className="mt-2 w-full justify-start rounded-xl" asChild>
            <Link to="/app/admin">
              <Store className="mr-2 size-4" /> Admin console
            </Link>
          </Button>
        )}
      </section>

      {showBusinessApply && (
        <section className="mt-4">
          {upgrade?.status === "pending" ? (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-extrabold text-primary">
                <Clock3 className="size-4" /> Business account pending
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your application for <strong>{upgrade.business_name}</strong> is with admin for
                approval. You stay on the shopping app until then.
              </p>
              <Button variant="outline" className="mt-3 w-full rounded-xl font-bold" asChild>
                <Link to="/shop/business-apply">View application</Link>
              </Button>
            </div>
          ) : (
            <Link
              to="/shop/business-apply"
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Store className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <p className="font-extrabold">Business account</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add shop details, location & photo — then request admin approval. Not a dashboard
                  yet.
                </p>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
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
