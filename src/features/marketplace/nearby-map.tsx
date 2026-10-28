"use client";

import { useEffect, useRef } from "react";

import { getMapsProvider } from "@/lib/maps/provider";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  subtitle?: string;
};

type NearbyMapProps = {
  centre: { lat: number; lng: number };
  pins: MapPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
};

/** Client-only OpenStreetMap + Leaflet map for nearby shops/products. */
export function NearbyMap({ centre, pins, selectedId, onSelect, className }: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const provider = getMapsProvider();
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([centre.lat, centre.lng], 13);

      L.tileLayer(provider.tileUrlTemplate, {
        attribution: provider.attribution,
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapRef.current = map;
      // Let layout settle on mobile before measuring.
      requestAnimationFrame(() => map.invalidateSize());
    }

    void init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; centre updates handled below
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([centre.lat, centre.lng], map.getZoom() || 13, { animate: true });
  }, [centre.lat, centre.lng]);

  useEffect(() => {
    let cancelled = false;

    async function syncMarkers() {
      const L = await import("leaflet");
      const map = mapRef.current;
      if (cancelled || !map) return;

      const youIcon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:9999px;background:#0f766e;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const existing = markersRef.current;
      const keep = new Set(pins.map((p) => p.id));
      keep.add("__you__");

      for (const [id, marker] of existing) {
        if (!keep.has(id)) {
          marker.remove();
          existing.delete(id);
        }
      }

      if (!existing.has("__you__")) {
        const you = L.marker([centre.lat, centre.lng], { icon: youIcon, zIndexOffset: 1000 }).addTo(map);
        you.bindTooltip("You", { direction: "top", offset: [0, -8] });
        existing.set("__you__", you);
      } else {
        existing.get("__you__")!.setLatLng([centre.lat, centre.lng]);
      }

      for (const pin of pins) {
        const active = pin.id === selectedId;
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            min-width:28px;height:28px;padding:0 8px;border-radius:9999px;
            display:flex;align-items:center;justify-content:center;
            font:700 11px/1 system-ui,sans-serif;color:#fff;
            background:${active ? "#0f766e" : "#1e3a4c"};
            border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28);
            transform:translateY(-4px);
          ">${escapeHtml(pin.subtitle ?? "•")}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const existingMarker = existing.get(pin.id);
        if (existingMarker) {
          existingMarker.setLatLng([pin.lat, pin.lng]);
          existingMarker.setIcon(icon);
          existingMarker.off("click");
          existingMarker.on("click", () => onSelectRef.current?.(pin.id));
        } else {
          const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map);
          marker.bindTooltip(pin.label, { direction: "top", offset: [0, -24] });
          marker.on("click", () => onSelectRef.current?.(pin.id));
          existing.set(pin.id, marker);
        }
      }

      if (pins.length > 0) {
        const bounds = L.latLngBounds([
          [centre.lat, centre.lng],
          ...pins.map((p) => [p.lat, p.lng] as [number, number]),
        ]);
        map.fitBounds(bounds.pad(0.2), { maxZoom: 15, animate: true });
      }

      requestAnimationFrame(() => map.invalidateSize());
    }

    void syncMarkers();
    return () => {
      cancelled = true;
    };
  }, [pins, selectedId, centre.lat, centre.lng]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label="Map of nearby shops"
    />
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
