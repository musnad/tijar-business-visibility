"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { ProductCard } from "@/features/marketplace/product-card";
import { useAuth } from "@/features/auth/auth-context";
import { AREA_PRESETS } from "@/lib/maps/provider";
import { listBusinessCategories } from "@/services/business-service";
import { fetchCart, fetchMarketplaceProducts, fetchMarketplaceShops } from "@/services/marketplace-service";
import {
  catalogSuggestions,
  filterCatalogProducts,
  filterCatalogSellers,
} from "@/utils/discover-catalog";
import { filterListings, formatDistance } from "@/utils/discover";

type Tab = "products" | "services" | "sellers" | "categories";

export function ShopDiscoverScreen() {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("products");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [attribute, setAttribute] = useState("");
  const [centre, setCentre] = useState<{ lat: number; lng: number } | null>(null);
  const [centreLabel, setCentreLabel] = useState("");
  const [geoMessage, setGeoMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["marketplace-products-browse"],
    queryFn: async () => {
      const r = await fetchMarketplaceProducts(200);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });
  const shopsQuery = useQuery({
    queryKey: ["marketplace-shops"],
    queryFn: async () => {
      const r = await fetchMarketplaceShops();
      if (r.error) throw new Error(r.error);
      return r.shops;
    },
  });
  const categoriesQuery = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => (await listBusinessCategories()).data,
  });
  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });

  const products = productsQuery.data ?? [];
  const shops = shopsQuery.data ?? [];
  const categoryNames = (categoriesQuery.data ?? []).map((c) => c.name);

  const suggestions = useMemo(
    () =>
      catalogSuggestions({
        query,
        products,
        sellers: shops,
        categories: categoryNames,
      }),
    [query, products, shops, categoryNames],
  );

  const filteredProducts = useMemo(
    () =>
      filterCatalogProducts(products, {
        query,
        kind: tab === "services" ? "service" : tab === "products" ? "goods" : "all",
        category: category || null,
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        availableOnly,
        attribute: attribute || null,
      }),
    [products, query, tab, category, minPrice, maxPrice, availableOnly, attribute],
  );

  const filteredSellers = useMemo(() => {
    const byQuery = filterCatalogSellers(shops, query, category ? shops.find((s) => s.category_name === category)?.category_id : null);
    if (!centre) return byQuery.map((s) => ({ ...s, distance_km: null as number | null }));
    return filterListings(
      byQuery
        .filter((s) => typeof s.latitude === "number" && typeof s.longitude === "number")
        .map((s) => ({
          ...s,
          latitude: s.latitude as number,
          longitude: s.longitude as number,
        })),
      { query, centre, radiusKm: 25 },
    );
  }, [shops, query, category, centre]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoMessage("Location is not available. Pick a city below. Your precise location is never published.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCentre({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCentreLabel("Your location");
        setGeoMessage("Nearby shops use this device location only in your browser. It is not saved as a public pin.");
      },
      () => setGeoMessage("Location permission denied. Pick a city or browse the full catalogue."),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;
  const tabs: { id: Tab; label: string }[] = [
    { id: "products", label: "Products" },
    { id: "services", label: "Services" },
    { id: "sellers", label: "Sellers" },
    { id: "categories", label: "Categories" },
  ];

  return (
    <MarketplaceShell cartCount={cartCount}>
      <h1 className="text-2xl font-extrabold">Discover</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Priced products and services appear as soon as a shop saves them. Nearby shop results still need a city or your permission — never a public GPS pin.
      </p>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search products, services, sellers, categories"
          className="h-11 rounded-2xl pl-9"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {suggestions.map((s) => (
              <li key={`${s.kind}-${s.label}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60"
                  onClick={() => {
                    setQuery(s.label);
                    setShowSuggestions(false);
                    if (s.kind === "seller") setTab("sellers");
                    else if (s.kind === "service") setTab("services");
                    else if (s.kind === "category") {
                      setCategory(s.label);
                      setTab("products");
                    } else setTab("products");
                  }}
                >
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">{s.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {categoryNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Input
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Min ₦"
          inputMode="numeric"
          className="h-10 w-24 rounded-xl"
        />
        <Input
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Max ₦"
          inputMode="numeric"
          className="h-10 w-24 rounded-xl"
        />
        <Input
          value={attribute}
          onChange={(e) => setAttribute(e.target.value)}
          placeholder="Size / colour"
          className="h-10 w-32 rounded-xl"
        />
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-input px-3 text-sm">
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
          Available
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-10 rounded-xl" onClick={useMyLocation}>
          <MapPin className="mr-1.5 size-4" /> Near me
        </Button>
        <select
          value={centreLabel}
          onChange={(e) => {
            const preset = AREA_PRESETS.find((a) => a.name === e.target.value);
            if (preset) {
              setCentre({ lat: preset.lat, lng: preset.lng });
              setCentreLabel(preset.name);
              setGeoMessage("");
            } else {
              setCentre(null);
              setCentreLabel("");
            }
          }}
          className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="">All areas</option>
          {AREA_PRESETS.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <Button variant="outline" className="min-h-10 rounded-xl" asChild>
          <Link to="/shop/nearby">Map</Link>
        </Button>
      </div>
      {geoMessage && <p className="mt-2 text-xs text-muted-foreground">{geoMessage}</p>}

      {tab === "categories" && (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categoryNames.map((c) => (
            <li key={c}>
              <button
                type="button"
                className="w-full rounded-2xl border border-border bg-card p-4 text-left font-bold"
                onClick={() => {
                  setCategory(c);
                  setTab("products");
                }}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}

      {(tab === "products" || tab === "services") && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      {tab === "sellers" && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {filteredSellers.map((shop) => (
            <li key={shop.id}>
              <Link
                to="/b/$slug"
                params={{ slug: shop.slug }}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3"
              >
                {shop.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shop.logo_url} alt="" className="size-14 rounded-2xl object-cover" />
                ) : (
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-muted font-extrabold">
                    {shop.business_name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-extrabold">
                    <span className="truncate">{shop.business_name}</span>
                    {shop.is_verified ? <BadgeCheck className="size-4 text-primary" /> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{shop.category_name}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="size-3" />
                    {shop.public_location_label ?? shop.location_text}
                    {shop.distance_km != null ? ` · ${formatDistance(shop.distance_km)}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MarketplaceShell>
  );
}
