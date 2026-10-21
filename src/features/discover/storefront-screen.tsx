"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, Info, MapPin, MessageCircle, Navigation, Phone, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TranslateText } from "@/features/translate/translate-text";
import { VoiceTranslate } from "@/features/translate/voice-translate";
import { getMapsProvider } from "@/lib/maps/provider";
import { fetchStorefront, submitEnquiry } from "@/services/discover-service";
import { formatNgn } from "@/utils/money";

const DAY_LABELS: [string, string][] = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"],
  ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
];

export function StorefrontScreen({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const query = useQuery({
    queryKey: ["storefront", slug],
    queryFn: async () => {
      const r = await fetchStorefront(slug);
      if (r.error) throw new Error(r.error);
      return r;
    },
  });

  const business = query.data?.business;
  const products = query.data?.products ?? [];

  async function onEnquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    if (!name.trim() || !message.trim()) {
      toast.error("Please add your name and a message.");
      return;
    }
    setSending(true);
    const { error } = await submitEnquiry({
      businessId: business.id,
      customerName: name,
      customerPhone: phone,
      message,
    });
    setSending(false);
    if (error) toast.error(error);
    else {
      toast.success("Message sent. The shop will contact you.");
      setMessage("");
    }
  }

  async function onShare() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: business?.business_name ?? "TIJAR shop", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Shop link copied.");
      }
    } catch {
      /* user cancelled share */
    }
  }

  if (query.isLoading) return <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading shop…</p>;

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Shop not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This shop is not published, or the link is wrong.</p>
        <Button asChild className="mt-5 rounded-xl"><Link to="/discover">Browse shops near you</Link></Button>
      </div>
    );
  }

  const directions = getMapsProvider().directionsUrl({ lat: business.latitude, lng: business.longitude, label: business.business_name });
  const hours = DAY_LABELS.filter(([k]) => business.opening_hours?.[k]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-start gap-4">
        {business.logo_url ? (
          <img src={business.logo_url} alt="" className="size-16 rounded-2xl object-cover" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-2xl font-extrabold">{business.business_name.slice(0, 1)}</span>
        )}
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
            {business.business_name}
            {business.is_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                <BadgeCheck className="size-3.5" /> Verified by TIJAR
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">{business.category_name ?? "Business"}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {business.public_location_label ?? business.location_text}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="ms-auto rounded-xl" onClick={onShare}>
          <Share2 className="mr-1 size-4" /> Share
        </Button>
      </div>

      <p className="mt-3 flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0" />
        <span>
          {business.is_verified
            ? "Verified by TIJAR means TIJAR checked this business. Shop details, prices and opening hours are provided by the owner and can change."
            : "Shop details, prices and opening hours are provided by the owner and can change. This business is not yet verified by TIJAR."}
        </span>
      </p>

      {business.description && (
        <div className="mt-4">
          <p className="leading-relaxed">{business.description}</p>
          <TranslateText text={business.description} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {business.public_phone && (
          <Button asChild className="min-h-11 rounded-xl"><a href={`tel:${business.public_phone}`}><Phone className="mr-1.5 size-4" /> Call</a></Button>
        )}
        {business.public_whatsapp && (
          <Button asChild variant="outline" className="min-h-11 rounded-xl">
            <a href={`https://wa.me/${business.public_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 size-4" /> WhatsApp</a>
          </Button>
        )}
        <Button asChild variant="outline" className="min-h-11 rounded-xl">
          <a href={directions} target="_blank" rel="noreferrer"><Navigation className="mr-1.5 size-4" /> Directions</a>
        </Button>
      </div>

      {hours.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-bold"><Clock className="size-4" /> Opening hours <span className="text-xs font-normal text-muted-foreground">(owner-provided)</span></h2>
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
            {hours.map(([k, label]) => (
              <li key={k} className="flex justify-between px-4 py-2 text-sm"><span>{label}</span><span className="font-semibold">{business.opening_hours[k]}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold">Products & services</h2>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No products listed yet. Send an enquiry below to ask what is available.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                {p.image_url && <img src={p.image_url} alt="" loading="lazy" className="h-36 w-full object-cover" />}
                <div className="p-3">
                  <p className="font-bold leading-tight">{p.name}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{p.kind === "service" ? "Service" : "Product"}</p>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <TranslateText text={`${p.name}. ${p.description ?? ""}`.trim()} label="Translate product" />
                  <p className="mt-2 flex items-center justify-between">
                    <span className="font-extrabold">{p.sale_price != null ? formatNgn(p.sale_price) : "Price on request"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.is_available ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {p.is_available ? "Available" : "Out of stock"}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-border p-4">
        <h2 className="font-bold">Send an enquiry</h2>
        <form onSubmit={onEnquiry} className="mt-3 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="min-h-11 rounded-xl text-base" required />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone (so the shop can reply)" className="min-h-11 rounded-xl text-base" inputMode="tel" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do you need?" rows={4} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base" required />
          <VoiceTranslate onUseTranscript={(text) => setMessage(text)} />
          <Button type="submit" disabled={sending} className="min-h-11 w-full rounded-xl font-bold">{sending ? "Sending…" : "Send message"}</Button>
        </form>
      </section>
    </div>
  );
}
