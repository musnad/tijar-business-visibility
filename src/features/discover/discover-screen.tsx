"use client";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, List, Map as MapIcon, MapPin, MessageCircle, Phone, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AREA_PRESETS } from "@/lib/maps/provider";
import { listBusinessCategories } from "@/services/business-service";
import { fetchListingProductNames, fetchPublishedBusinesses } from "@/services/discover-service";
import type { PublicBusiness } from "@/types/database";
import { filterListings, formatDistance } from "@/utils/discover";
import { DiscoverMap } from "./discover-map";

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

export function DiscoverScreen() {
  const navigate = useNavigate();
  const [view, setView] = useState<"list" | "map">("list");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [centre, setCentre] = useState<{ lat: number; lng: number } | null>(null);
  const [centreLabel, setCentreLabel] = useState<string>("");
  const [geoMessage, setGeoMessage] = useState<string>("");

  const listingsQuery = useQuery({
    queryKey: ["discover-listings"],
    queryFn: async () => {
      const [listings, productNames] = await Promise.all([
        fetchPublishedBusinesses(),
        fetchListingProductNames(),
      ]);
      if (listings.error) throw new Error(listings.error);
      return listings.data.map((b) => ({ ...b, product_names: productNames.get(b.id) ?? [] }));
    },
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => (await listBusinessCategories()).data,
    staleTime: 300_000,
  });

  const results = useMemo(
    () =>
      filterListings(listingsQuery.data ?? [], {
        query,
        categoryId: categoryId || null,
        centre,
        radiusKm: centre ? radiusKm : null,
        verifiedOnly,
      }),
    [listingsQuery.data, query, categoryId, centre, radiusKm, verifiedOnly],
  );

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoMessage("Location is not available on this device. Pick an area below instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCentre({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCentreLabel("Your location");
        setGeoMessage("");
      },
      () => {
        // Denial must not block discovery (acceptance criterion)
        setGeoMessage("Location permission denied. Pick an area below, or browse all shops.");
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Discover local businesses</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Real shops near you, published by their owners on TIJAR.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, category, product or service…"
            className="min-h-11 rounded-xl pl-9 text-base"
            aria-label="Search businesses"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
          aria-label="Category"
        >
          <option value="">All categories</option>
          {(categoriesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
            } else {
              setCentre(null);
              setCentreLabel("");
            }
          }}
          className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm"
          aria-label="Choose area manually"
        >
          <option value="">All areas</option>
          {AREA_PRESETS.map((a) => (
            <option key={a.name} value={a.name}>{a.name}</option>
          ))}
        </select>
        {centre && (
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm"
            aria-label="Distance"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>Within {r} km</option>
            ))}
          </select>
        )}
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-input px-3 text-sm">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
          Verified only
        </label>
        <div className="ms-auto flex overflow-hidden rounded-xl border border-input" role="tablist" aria-label="View">
          <button type="button" onClick={() => setView("list")} className={`flex min-h-10 items-center gap-1 px-3 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : ""}`}>
            <List className="size-4" /> List
          </button>
          <button type="button" onClick={() => setView("map")} className={`flex min-h-10 items-center gap-1 px-3 text-sm ${view === "map" ? "bg-primary text-primary-foreground" : ""}`}>
            <MapIcon className="size-4" /> Map
          </button>
        </div>
      </div>

      {geoMessage && <p className="mt-2 text-sm text-amber-700">{geoMessage}</p>}
      {centre && <p className="mt-2 text-xs text-muted-foreground">Showing near: {centreLabel || "selected point"}</p>}

      {listingsQuery.isLoading && <p className="mt-8 text-muted-foreground">Loading shops…</p>}
      {listingsQuery.isError && (
        <p className="mt-8 text-sm text-destructive">Could not load shops. Check your connection and try again.</p>
      )}

      {listingsQuery.data && (
        <p className="mt-5 text-sm text-muted-foreground">{results.length} shop{results.length === 1 ? "" : "s"} found</p>
      )}

      {view === "map" && listingsQuery.data && (
        <div className="mt-4">
          <DiscoverMap
            listings={results as PublicBusiness[]}
            centre={centre}
            onSelect={(slug) => void navigate({ to: "/b/$slug", params: { slug } })}
          />
        </div>
      )}

      {view === "list" && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((b) => (
            <li key={b.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <Link to="/b/$slug" params={{ slug: b.slug }} className="block p-4">
                <div className="flex items-start gap-3">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" loading="lazy" className="size-12 rounded-xl object-cover" />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-xl bg-muted font-extrabold">{b.business_name.slice(0, 1)}</span>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-bold leading-tight">
                      <span className="truncate">{b.business_name}</span>
                      {b.is_verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified by TIJAR" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.category_name ?? "Business"}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {b.public_location_label ?? b.location_text ?? "Area available on shop page"}
                      {b.distance_km != null && <> · {formatDistance(b.distance_km)}</>}
                    </p>
                  </div>
                </div>
                {b.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>}
              </Link>
              <div className="flex gap-2 border-t border-border px-4 py-2.5">
                {b.public_phone && (
                  <a href={`tel:${b.public_phone}`} className="flex items-center gap-1 text-xs font-semibold text-primary"><Phone className="size-3.5" /> Call</a>
                )}
                {b.public_whatsapp && (
                  <a href={`https://wa.me/${b.public_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-primary"><MessageCircle className="size-3.5" /> WhatsApp</a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {listingsQuery.data && results.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No published shops match yet. Try a wider area or a different search.</p>
        </div>
      )}
    </div>
  );
}
