"use client";

import { useEffect, useRef } from "react";

import { getMapsProvider } from "@/lib/maps/provider";
import type { PublicBusiness } from "@/types/database";

/**
 * Leaflet map loaded lazily (client-only) so SSR and low-end devices
 * only pay for the map when the user opens the Map view.
 */
export function DiscoverMap({
  listings,
  centre,
  onSelect,
}: {
  listings: PublicBusiness[];
  centre: { lat: number; lng: number } | null;
  onSelect: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      // Fix default marker icons under bundlers
      const iconRetina = (await import("leaflet/dist/images/marker-icon-2x.png")).default as string;
      const icon = (await import("leaflet/dist/images/marker-icon.png")).default as string;
      const shadow = (await import("leaflet/dist/images/marker-shadow.png")).default as string;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetina, iconUrl: icon, shadowUrl: shadow });

      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }

      const provider = getMapsProvider();
      const start = centre ?? (listings[0] ? { lat: listings[0].latitude, lng: listings[0].longitude } : { lat: 9.08, lng: 8.68 });
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([start.lat, start.lng], centre ? 12 : 6);
      mapRef.current = map;

      L.tileLayer(provider.tileUrlTemplate, { attribution: provider.attribution, maxZoom: 19 }).addTo(map);

      if (centre) {
        L.circleMarker([centre.lat, centre.lng], { radius: 7, color: "#2563eb", fillOpacity: 0.7 })
          .addTo(map)
          .bindPopup("Your selected area");
      }

      for (const b of listings) {
        const marker = L.marker([b.latitude, b.longitude]).addTo(map);
        marker.bindPopup(
          `<strong>${escapeHtml(b.business_name)}</strong><br/>${escapeHtml(b.category_name ?? "")}<br/><a href="/b/${b.slug}">View shop</a>`,
        );
        marker.on("click", () => {
          // Popup link handles navigation; notify parent on double-click intent via popup open
        });
        marker.on("dblclick", () => onSelect(b.slug));
      }

      if (listings.length > 1) {
        const bounds = L.latLngBounds(listings.map((b) => [b.latitude, b.longitude] as [number, number]));
        map.fitBounds(bounds.pad(0.15));
      }
    })();

    return () => {
      cancelled = true;
    };
    // Rebuild markers when results change
  }, [listings, centre, onSelect]);

  return <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-2xl border border-border" aria-label="Map of nearby businesses" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
