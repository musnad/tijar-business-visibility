"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPin, Search, Store } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { ProductCard } from "@/features/marketplace/product-card";
import { useAuth } from "@/features/auth/auth-context";
import { fetchCart, fetchMarketplaceProducts } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";
import type { PublicProduct } from "@/types/database";

const CATEGORY_CARDS = [
  { key: "fashion", label: "Fashion", hint: "Clothes & style", words: ["cloth", "dress", "shirt", "fashion", "shoe", "abaya", "hijab", "fabric", "wear"] },
  { key: "food", label: "Food", hint: "Groceries", words: ["food", "rice", "oil", "spice", "snack", "drink", "garri", "beans", "flour", "meat", "fish"] },
  { key: "electronics", label: "Electronics", hint: "Gadgets", words: ["electronic", "gadget", "charger", "cable", "laptop", "radio", "tv", "fan"] },
  { key: "beauty", label: "Beauty", hint: "Personal care", words: ["beauty", "cream", "soap", "perfume", "hair", "cosmetic", "lotion"] },
  { key: "home", label: "Home", hint: "Living", words: ["home", "kitchen", "pot", "plate", "furniture", "bucket", "mat"] },
  { key: "phones", label: "Phones", hint: "Accessories", words: ["phone", "mobile", "sim", "earpiece", "power bank", "case"] },
  { key: "agriculture", label: "Farm", hint: "Agriculture", words: ["farm", "seed", "fertilizer", "feed", "poultry", "crop", "livestock"] },
  { key: "services", label: "Services", hint: "Local help", words: ["service", "repair", "tailor", "laundry", "delivery", "install"] },
] as const;

function matchesCategory(product: PublicProduct, key: string): boolean {
  const card = CATEGORY_CARDS.find((c) => c.key === key);
  if (!card) return true;
  const hay = `${product.name} ${product.description ?? ""} ${product.category_name ?? ""} ${product.kind}`.toLowerCase();
  if (key === "services" && product.kind === "service") return true;
  return card.words.some((w) => hay.includes(w));
}

export function ShopHomeScreen() {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (productsQuery.data ?? []).filter((p) => {
      if (categoryFilter && !matchesCategory(p, categoryFilter)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.business_name ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.category_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [productsQuery.data, query, categoryFilter]);

  const featured = filtered.slice(0, 24);
  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <MarketplaceShell cartCount={cartCount}>
      <section className="dashboard-summary-card relative overflow-hidden rounded-2xl p-4 text-primary-foreground shadow-lg sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">TIJAR Marketplace</p>
        <h1 className="mt-1.5 text-xl font-extrabold leading-tight sm:text-2xl">
          {firstName ? `Hi ${firstName}` : "Shop informal businesses"}
        </h1>
        <p className="mt-1 text-sm text-white/85">
          Products from local traders, artisans, and micro-shops — priced in ₦.
        </p>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or shops…"
            className="min-h-11 rounded-xl border-0 bg-background pl-9 text-base text-foreground shadow-sm"
            aria-label="Search marketplace"
          />
        </div>
        <Button
          className="mt-3 min-h-11 w-full rounded-xl border-0 bg-white/15 font-bold text-white hover:bg-white/25"
          asChild
        >
          <Link to="/shop/nearby">
            <MapPin className="mr-1.5 size-4" /> Discover nearby products on map
          </Link>
        </Button>
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold">Categories</h2>
          <Link
            to="/shop/nearby"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary"
          >
            <Store className="size-3.5" /> Near me
          </Link>
        </div>
        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_CARDS.map((c) => {
            const active = categoryFilter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategoryFilter((prev) => (prev === c.key ? "" : c.key))}
                className={`min-w-[6.75rem] shrink-0 rounded-2xl border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <p className="text-sm font-bold">{c.label}</p>
                <p className="text-[11px] text-muted-foreground">{c.hint}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold">
            {categoryFilter ? "Filtered products" : "Featured products"}
          </h2>
          <p className="text-xs text-muted-foreground">{filtered.length} items</p>
        </div>

        {productsQuery.isLoading && (
          <p className="mt-4 text-sm text-muted-foreground">Loading products…</p>
        )}
        {productsQuery.isError && (
          <p className="mt-4 text-sm text-destructive">
            Could not load products. Apply the informal marketplace migration and publish shops.
          </p>
        )}
        {!productsQuery.isLoading && featured.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <p className="font-semibold">No informal products yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Published informal TIJAR businesses appear here once they list goods.
            </p>
            <Button className="mt-4 rounded-xl font-bold" asChild>
              <Link to="/discover">Browse businesses</Link>
            </Button>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold">Prices in Nigerian Naira (₦)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Example: {formatNgn(1500)} — sellers set their own prices. Checkout uses test payment until
          Paystack/Flutterwave is configured.
        </p>
      </section>
    </MarketplaceShell>
  );
}
