"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMapsProvider, type GeocodeResult } from "@/lib/maps/provider";
import { TranslateText } from "@/features/translate/translate-text";
import { fetchProductsDashboard } from "@/services/product-analytics-service";
import { fetchBusinessEnquiries, isSlugAvailable, updateBusinessListing } from "@/services/discover-service";
import type { Business } from "@/types/database";
import { isValidSlug, listingCompleteness, slugifyBusinessName } from "@/utils/discover";

const DAYS: [string, string][] = [
  ["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"],
];

export function PublishBusinessForm({ business }: { business: Business }) {
  const [slug, setSlug] = useState(business.public_slug ?? slugifyBusinessName(business.business_name));
  const [published, setPublished] = useState(business.is_published);
  const [phone, setPhone] = useState(business.public_phone ?? "");
  const [whatsapp, setWhatsapp] = useState(business.public_whatsapp ?? "");
  const [lat, setLat] = useState<string>(business.latitude?.toString() ?? "");
  const [lng, setLng] = useState<string>(business.longitude?.toString() ?? "");
  const [locationLabel, setLocationLabel] = useState(business.public_location_label ?? business.location ?? "");
  const [approved, setApproved] = useState(business.location_approved);
  const [hours, setHours] = useState<Record<string, string>>(business.opening_hours ?? {});
  const [placeQuery, setPlaceQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const [saving, setSaving] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["products-dashboard", business.id],
    queryFn: async () => (await fetchProductsDashboard(business.id)).data,
  });

  const enquiriesQuery = useQuery({
    queryKey: ["business-enquiries", business.id],
    queryFn: async () => (await fetchBusinessEnquiries(business.id)).data,
  });

  const completeness = useMemo(
    () =>
      listingCompleteness({
        business_name: business.business_name,
        description: business.description,
        public_slug: slug,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        location_approved: approved,
        public_phone: phone,
        public_whatsapp: whatsapp,
        logo_url: business.logo_url,
        productCount: productsQuery.data?.productCount ?? 0,
      }),
    [business, slug, lat, lng, approved, phone, whatsapp, productsQuery.data],
  );

  async function searchPlace() {
    const results = await getMapsProvider().geocode(placeQuery);
    setCandidates(results);
    if (results.length === 0) toast.message("No places found. You can type coordinates manually.");
  }

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success("Location captured. Check it is your shop, then approve it below.");
      },
      () => toast.error("Location permission denied. Search for your area instead."),
      { timeout: 10_000 },
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const cleanSlug = slug.trim().toLowerCase();
    if (cleanSlug && !isValidSlug(cleanSlug)) {
      toast.error("Shop link can only use small letters, numbers and dashes.");
      return;
    }
    if (published && cleanSlug && !(await isSlugAvailable(cleanSlug, business.id))) {
      toast.error("That shop link is taken. Try another.");
      return;
    }
    const latNum = lat ? Number(lat) : null;
    const lngNum = lng ? Number(lng) : null;
    if (published && (latNum === null || lngNum === null || !approved)) {
      toast.error("To publish, add your shop location and approve showing it publicly.");
      return;
    }
    setSaving(true);
    const { error } = await updateBusinessListing(business.id, {
      publicSlug: cleanSlug,
      isPublished: published,
      publicPhone: phone,
      publicWhatsapp: whatsapp,
      openingHours: Object.fromEntries(Object.entries(hours).filter(([, v]) => v.trim())),
      latitude: latNum,
      longitude: lngNum,
      publicLocationLabel: locationLabel,
      locationApproved: approved,
    });
    setSaving(false);
    if (error) toast.error(error);
    else toast.success(published ? "Saved. Your shop appears after TIJAR approval." : "Saved.");
  }

  return (
    <form onSubmit={onSave} className="mt-5 space-y-5">
      <div className="rounded-2xl border border-border p-4">
        <p className="font-bold">Listing completeness: {completeness.score}%</p>
        {completeness.missing.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">Still needed: {completeness.missing.join(", ")}.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Status: <strong>{business.moderation_status}</strong>
          {business.moderation_status !== "approved" && " — a TIJAR admin must approve before customers can see your shop."}
        </p>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-border p-4">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-5" />
        <span><strong>Publish my shop on TIJAR Discover</strong><br /><span className="text-sm text-muted-foreground">Customers can find you, call, message and send enquiries.</span></span>
      </label>

      <div>
        <label className="text-sm font-semibold" htmlFor="slug">Shop link</label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">tijar…/b/</span>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="min-h-11 rounded-xl text-base" placeholder="aisha-foods" />
        </div>
        {published && slug && (
          <Link to="/b/$slug" params={{ slug }} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Preview shop page <ExternalLink className="size-3" />
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor="pub-phone">Public phone</label>
          <Input id="pub-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 min-h-11 rounded-xl text-base" inputMode="tel" placeholder="0803…" />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="pub-wa">WhatsApp number</label>
          <Input id="pub-wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1 min-h-11 rounded-xl text-base" inputMode="tel" placeholder="234803…" />
        </div>
      </div>

      <fieldset className="rounded-2xl border border-border p-4">
        <legend className="flex items-center gap-1 px-1 font-bold"><MapPin className="size-4" /> Shop location</legend>
        <p className="text-sm text-muted-foreground">Use your <strong>shop</strong> location, not your home. Only the area label and map pin are shown publicly.</p>
        <div className="mt-3 flex gap-2">
          <Input value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)} placeholder="Search area, e.g. Sabon Gari Kano" className="min-h-11 rounded-xl text-base" />
          <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={searchPlace}><Search className="size-4" /></Button>
        </div>
        {candidates.length > 0 && (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
            {candidates.map((c) => (
              <li key={`${c.lat},${c.lng}`}>
                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setLat(c.lat.toFixed(6)); setLng(c.lng.toFixed(6)); setLocationLabel(c.label.split(",").slice(0, 2).join(",")); }}>
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" className="mt-3 min-h-11 rounded-xl" onClick={useMyLocation}>Use my current location</Button>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" inputMode="decimal" className="min-h-11 rounded-xl" aria-label="Latitude" />
          <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" inputMode="decimal" className="min-h-11 rounded-xl" aria-label="Longitude" />
          <Input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="Public area label" className="min-h-11 rounded-xl" aria-label="Public area label" />
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="mt-0.5 size-5" />
          I approve showing this shop location publicly on TIJAR.
        </label>
      </fieldset>

      <fieldset className="rounded-2xl border border-border p-4">
        <legend className="px-1 font-bold">Opening hours <span className="text-xs font-normal text-muted-foreground">(owner-provided)</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {DAYS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <span className="w-10 font-semibold">{label}</span>
              <Input value={hours[k] ?? ""} onChange={(e) => setHours({ ...hours, [k]: e.target.value })} placeholder="8:00–18:00 or Closed" className="min-h-10 rounded-xl" />
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        Products and services come from your <Link to="/app/products" className="font-semibold text-primary">Products</Link> page — active items with photos and prices appear on your shop automatically.
      </p>

      <Button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl font-bold">{saving ? "Saving…" : "Save shop listing"}</Button>

      <section className="rounded-2xl border border-border p-4">
        <h2 className="font-bold">Customer enquiries</h2>
        {(enquiriesQuery.data ?? []).length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No enquiries yet. They appear here when customers message your shop page.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {(enquiriesQuery.data ?? []).map((enq) => (
              <li key={enq.id} className="rounded-xl bg-muted/60 p-3 text-sm">
                <p className="font-semibold">{enq.customer_name} {enq.customer_phone && <span className="font-normal text-muted-foreground">· {enq.customer_phone}</span>}</p>
                <p className="mt-0.5">{enq.message}</p>
                <TranslateText text={enq.message} label="Translate message" allowSourceSelect />
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(enq.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </form>
  );
}
