"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { ProductCard } from "@/features/marketplace/product-card";
import { useAuth } from "@/features/auth/auth-context";
import { fetchCart, fetchMarketplaceProducts } from "@/services/marketplace-service";

export function ShopBrowseScreen() {
  const { profile } = useAuth();
  const [q, setQ] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const productsQuery = useQuery({
    queryKey: ["marketplace-products-browse"],
    queryFn: async () => {
      const r = await fetchMarketplaceProducts(160);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });
  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    return (productsQuery.data ?? []).filter((p) => {
      if (availableOnly && !p.is_available) return false;
      if (min != null && (p.sale_price == null || Number(p.sale_price) < min)) return false;
      if (max != null && (p.sale_price == null || Number(p.sale_price) > max)) return false;
      if (!needle) return true;
      return [p.name, p.business_name, p.category_name, p.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [productsQuery.data, q, availableOnly, minPrice, maxPrice]);

  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;

  return (
    <MarketplaceShell cartCount={cartCount}>
      <h1 className="text-2xl font-extrabold">Shop</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live catalogue prices from seller inventory.</p>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="h-11 rounded-2xl pl-9" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min ₦" className="h-10 w-24 rounded-xl" inputMode="numeric" />
        <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₦" className="h-10 w-24 rounded-xl" inputMode="numeric" />
        <label className="flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm">
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
          Available
        </label>
      </div>
      {productsQuery.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading products…</p>}
      {productsQuery.isError && <p className="mt-6 text-sm text-destructive">Could not load the catalogue.</p>}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </MarketplaceShell>
  );
}
