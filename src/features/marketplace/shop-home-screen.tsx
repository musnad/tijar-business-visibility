"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { ProductCard } from "@/features/marketplace/product-card";
import { useAuth } from "@/features/auth/auth-context";
import { listBusinessCategories } from "@/services/business-service";
import { fetchCart, fetchMarketplaceProducts } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";

const CATEGORY_CARDS = [
  { key: "fashion", label: "Fashion", hint: "Clothes & style" },
  { key: "food", label: "Food", hint: "Groceries" },
  { key: "electronics", label: "Electronics", hint: "Gadgets" },
  { key: "beauty", label: "Beauty", hint: "Personal care" },
  { key: "home", label: "Home", hint: "Living" },
  { key: "phones", label: "Phones", hint: "Accessories" },
  { key: "agriculture", label: "Farm", hint: "Agriculture" },
  { key: "services", label: "Services", hint: "Local help" },
];

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

  const categoriesQuery = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => (await listBusinessCategories()).data,
    staleTime: 300_000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (productsQuery.data ?? []).filter((p) => {
      if (categoryFilter && !(p.name + (p.description ?? "")).toLowerCase().includes(categoryFilter)) {
        // soft category match by keyword cards
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.business_name ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [productsQuery.data, query, categoryFilter]);

  const featured = filtered.slice(0, 8);
  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;

  return (
    <MarketplaceShell cartCount={cartCount}>
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#001B3A] via-[#0a3d5c] to-teal-800 p-5 text-white shadow-lg">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/70">
          <Sparkles className="size-3.5" /> TIJAR Marketplace
        </p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight">
          {profile?.full_name ? `Hi ${profile.full_name.split(" ")[0]}` : "Discover products"}
        </h1>
        <p className="mt-1 text-sm text-white/80">Discover products from businesses around you.</p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, shops, brands…"
            className="min-h-12 rounded-2xl border-0 bg-white pl-10 text-foreground"
          />
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold">Categories</h2>
          <Link to="/discover" className="text-xs font-bold text-teal-800">
            Find shops →
          </Link>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_CARDS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategoryFilter((prev) => (prev === c.key ? "" : c.key))}
              className={`min-w-[7.5rem] rounded-2xl border px-3 py-3 text-left ${
                categoryFilter === c.key
                  ? "border-teal-700 bg-teal-50"
                  : "border-border bg-white"
              }`}
            >
              <p className="text-sm font-bold">{c.label}</p>
              <p className="text-[11px] text-muted-foreground">{c.hint}</p>
            </button>
          ))}
        </div>
        {(categoriesQuery.data?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categoriesQuery.data!.slice(0, 8).map((c) => (
              <span key={c.id} className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                {c.name}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold">Featured products</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} items</p>
        </div>
        {productsQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading products…</p>}
        {productsQuery.isError && (
          <p className="mt-4 text-sm text-destructive">
            Could not load products. Apply marketplace migration and publish businesses.
          </p>
        )}
        {!productsQuery.isLoading && featured.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-6 text-center">
            <p className="font-semibold">No products yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Published TIJAR businesses will appear here once they list goods.
            </p>
            <Button className="mt-4 rounded-xl font-bold" asChild>
              <Link to="/discover">Browse businesses</Link>
            </Button>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-white p-4">
        <p className="text-sm font-bold">Prices in Nigerian Naira (₦)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Example: {formatNgn(1500)} — real prices come from each seller. Payment uses test mode until
          Paystack/Flutterwave keys are configured.
        </p>
      </section>
    </MarketplaceShell>
  );
}
