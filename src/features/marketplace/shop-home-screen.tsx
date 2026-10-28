"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Search, Sparkles, Store } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { ProductCard } from "@/features/marketplace/product-card";
import {
  MARKETPLACE_SECTORS,
  countBySector,
  matchesSector,
} from "@/features/marketplace/marketplace-sectors";
import { useAuth } from "@/features/auth/auth-context";
import { fetchCart, fetchMarketplaceProducts } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";
import { cn } from "@/lib/utils";

export function ShopHomeScreen() {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  const productsQuery = useQuery({
    queryKey: ["marketplace-products"],
    queryFn: async () => {
      const res = await fetchMarketplaceProducts();
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    staleTime: 60_000,
  });

  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const res = await fetchCart(profile!.id);
      if (res.error) throw new Error(res.error);
      return res.items;
    },
  });

  const allProducts = productsQuery.data ?? [];

  const sectorCounts = useMemo(() => countBySector(allProducts), [allProducts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (sectorFilter && !matchesSector(p, sectorFilter)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.business_name ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.category_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [allProducts, query, sectorFilter]);

  const shopsCount = useMemo(() => {
    const ids = new Set(allProducts.map((p) => p.business_id));
    return ids.size;
  }, [allProducts]);

  const featured = filtered.slice(0, sectorFilter ? 48 : 12);
  const freshDeals = useMemo(
    () =>
      [...allProducts]
        .filter((p) => p.sale_price != null && Number(p.sale_price) > 0)
        .sort((a, b) => Number(a.sale_price) - Number(b.sale_price))
        .slice(0, 8),
    [allProducts],
  );

  const activeSector = MARKETPLACE_SECTORS.find((s) => s.key === sectorFilter);
  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <MarketplaceShell cartCount={cartCount}>
      {/* Hero */}
      <section className="marketplace-hero relative overflow-hidden rounded-[1.35rem] p-4 text-primary-foreground shadow-lg sm:p-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-8 size-40 rounded-full bg-teal-300/15 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90">
            <Sparkles className="size-3" /> Informal marketplace
          </p>
          <h1 className="mt-2.5 text-[1.35rem] font-extrabold leading-tight tracking-tight sm:text-2xl">
            {firstName ? `Welcome, ${firstName}` : "Shop local traders"}
          </h1>
          <p className="mt-1.5 max-w-[28ch] text-sm leading-relaxed text-white/85">
            Food, fashion, repairs, and more from micro-businesses near you — in ₦.
          </p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rice, abaya, charger…"
              className="min-h-12 rounded-2xl border-0 bg-background pl-10 text-base text-foreground shadow-sm"
              aria-label="Search marketplace"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              className="min-h-11 flex-1 rounded-2xl border-0 bg-white font-bold text-[oklch(0.32_0.06_195)] hover:bg-white/95"
              asChild
            >
              <Link to="/shop/nearby">
                <MapPin className="mr-1.5 size-4" /> Near me
              </Link>
            </Button>
            <Button
              variant="outline"
              className="min-h-11 flex-1 rounded-2xl border-white/35 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white"
              asChild
            >
              <Link to="/discover">
                <Store className="mr-1.5 size-4" /> Shops
              </Link>
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/12 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-base font-extrabold tabular-nums">{allProducts.length}</p>
              <p className="text-[10px] font-semibold text-white/75">Products</p>
            </div>
            <div className="rounded-xl bg-white/12 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-base font-extrabold tabular-nums">{shopsCount}</p>
              <p className="text-[10px] font-semibold text-white/75">Shops</p>
            </div>
            <div className="rounded-xl bg-white/12 px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-base font-extrabold tabular-nums">{MARKETPLACE_SECTORS.length}</p>
              <p className="text-[10px] font-semibold text-white/75">Sectors</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card px-3 py-2.5 text-[11px] font-semibold text-muted-foreground [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="inline-flex shrink-0 items-center gap-1 text-primary">
          <BadgeCheck className="size-3.5" /> Informal sellers
        </span>
        <span className="text-border">·</span>
        <span className="shrink-0">Prices in ₦</span>
        <span className="text-border">·</span>
        <span className="shrink-0">Buy from real local shops</span>
      </div>

      {/* Sectors */}
      <section className="mt-5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold tracking-tight">Business sectors</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Browse by informal trade</p>
          </div>
          {sectorFilter ? (
            <button
              type="button"
              className="text-xs font-bold text-primary"
              onClick={() => setSectorFilter("")}
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {MARKETPLACE_SECTORS.map((sector) => {
            const Icon = sector.icon;
            const active = sectorFilter === sector.key;
            const count = sectorCounts.get(sector.key) ?? 0;
            return (
              <button
                key={sector.key}
                type="button"
                onClick={() => setSectorFilter((prev) => (prev === sector.key ? "" : sector.key))}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-2xl border p-2.5 text-left transition active:scale-[0.98]",
                  active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/80 bg-card hover:border-primary/25",
                )}
              >
                <span
                  className="flex size-9 items-center justify-center rounded-xl"
                  style={{ background: sector.tint }}
                >
                  <Icon className={cn("size-4", active ? "text-primary" : "text-foreground/80")} />
                </span>
                <span>
                  <p className="text-[11px] font-extrabold leading-tight">{sector.label}</p>
                  <p className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground">
                    {count > 0 ? `${count} items` : sector.hint}
                  </p>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Value deals — only when not filtering */}
      {!sectorFilter && !query.trim() && freshDeals.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Starter prices</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Affordable picks from traders</p>
            </div>
          </div>
          <div className="mt-3 -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {freshDeals.map((p) => (
              <div key={p.id} className="w-[42%] shrink-0 sm:w-[38%]">
                <ProductCard product={p} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section className="mt-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold tracking-tight">
              {activeSector ? activeSector.label : query.trim() ? "Search results" : "Featured for you"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "product" : "products"}
              {activeSector ? ` · ${activeSector.hint}` : ""}
            </p>
          </div>
        </div>

        {productsQuery.isLoading && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="space-y-2 p-2.5">
                  <div className="h-3 w-[80%] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[40%] animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {productsQuery.isError && (
          <p className="mt-4 text-sm text-destructive">
            Could not load products. Publish informal shops with products to fill the market.
          </p>
        )}

        {!productsQuery.isLoading && featured.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <Store className="mx-auto size-9 text-muted-foreground" />
            <p className="mt-2 font-semibold">
              {sectorFilter || query.trim() ? "Nothing in this sector yet" : "Market is warming up"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Informal TIJAR businesses appear here once they list goods.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {(sectorFilter || query.trim()) && (
                <Button
                  variant="outline"
                  className="rounded-xl font-bold"
                  onClick={() => {
                    setSectorFilter("");
                    setQuery("");
                  }}
                >
                  Show all products
                </Button>
              )}
              <Button className="rounded-xl font-bold" asChild>
                <Link to="/shop/nearby">Explore nearby map</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mt-4 mb-2 rounded-2xl border border-border/80 bg-[linear-gradient(180deg,oklch(0.98_0.015_165),oklch(0.99_0.008_160))] p-4">
        <p className="text-sm font-extrabold">Built for informal trade</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Example price {formatNgn(1500)} — each seller sets their own. You buy from real micro-shops,
          artisans, and market traders on TIJAR.
        </p>
      </section>
    </MarketplaceShell>
  );
}
