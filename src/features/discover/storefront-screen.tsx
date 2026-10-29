"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Clock, Flag, Info, MapPin, MessageCircle, Navigation, Phone, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { TranslateText } from "@/features/translate/translate-text";
import { VoiceTranslate } from "@/features/translate/voice-translate";
import { useTranslation } from "@/lib/i18n/context";
import { getMapsProvider } from "@/lib/maps/provider";
import { nkenneLanguageForLocale } from "@/lib/nkenne/languages";
import { addToCart, reportListing } from "@/services/marketplace-service";
import { fetchStorefront, submitEnquiry } from "@/services/discover-service";
import { fetchMyFollowedBusinessIds, resolveCoverSrc, resolveVideoSrc, toggleFollowBusiness } from "@/services/video-feed-service";
import { formatNgn } from "@/utils/money";

export function StorefrontScreen({ slug }: { slug: string }) {
  const { t, locale } = useTranslation();
  const voiceLang = nkenneLanguageForLocale(locale) ?? "English";
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);

  const DAY_LABELS: [string, string][] = [
    ["mon", t("app.storefront.monday")],
    ["tue", t("app.storefront.tuesday")],
    ["wed", t("app.storefront.wednesday")],
    ["thu", t("app.storefront.thursday")],
    ["fri", t("app.storefront.friday")],
    ["sat", t("app.storefront.saturday")],
    ["sun", t("app.storefront.sunday")],
  ];

  const query = useQuery({
    queryKey: ["storefront", slug],
    queryFn: async () => {
      const r = await fetchStorefront(slug);
      if (r.error) throw new Error(r.error);
      return r;
    },
  });

  const follows = useQuery({
    queryKey: ["followed-ids", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: () => fetchMyFollowedBusinessIds(profile!.id),
  });

  const business = query.data?.business;
  const products = query.data?.products ?? [];
  const videos = query.data?.videos ?? [];
  const following = Boolean(business && follows.data?.has(business.id));

  async function onEnquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    if (!name.trim() || !message.trim()) {
      toast.error(t("app.storefront.enquiryValidation"));
      return;
    }
    setSending(true);
    const { error } = await submitEnquiry({
      businessId: business.id,
      customerName: name,
      customerPhone: phone,
      message,
      profileId: profile?.id,
    });
    setSending(false);
    if (error) toast.error(error);
    else {
      toast.success(t("app.storefront.enquirySuccess"));
      setMessage("");
    }
  }

  async function onShare() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: business?.business_name ?? t("app.storefront.defaultShopName"), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("app.storefront.linkCopied"));
      }
    } catch {
      /* user cancelled share */
    }
  }

  async function onFollow() {
    if (!session || !profile || !business) {
      void navigate({ to: "/login" });
      return;
    }
    const r = await toggleFollowBusiness(profile.id, business.id);
    if (r.error) toast.error(r.error);
    else {
      toast.success(r.following ? "Following this shop" : "Unfollowed");
      await queryClient.invalidateQueries({ queryKey: ["followed-ids"] });
    }
  }

  async function onReport() {
    if (!session || !profile || !business) {
      void navigate({ to: "/login" });
      return;
    }
    setReporting(true);
    const r = await reportListing({ reporterId: profile.id, businessId: business.id, reason: "other" });
    setReporting(false);
    if (r.error) toast.error(r.error);
    else toast.success("Report sent to TIJAR. We do not show fake reviews.");
  }

  if (query.isLoading) return <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">{t("app.storefront.loading")}</p>;

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{t("app.storefront.notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("app.storefront.notFoundBody")}</p>
        <Button asChild className="mt-5 rounded-xl">
          <Link to="/discover">{t("app.storefront.browseShops")}</Link>
        </Button>
      </div>
    );
  }

  const directions =
    business.latitude != null && business.longitude != null
      ? getMapsProvider().directionsUrl({
          lat: business.latitude,
          lng: business.longitude,
          label: business.business_name,
        })
      : null;
  const hours = DAY_LABELS.filter(([k]) => business.opening_hours?.[k]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {business.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={business.cover_image_url} alt="" className="mb-4 h-40 w-full rounded-3xl object-cover" />
      )}
      <div className="flex items-start gap-4">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logo_url} alt="" className="size-16 rounded-2xl object-cover" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-2xl font-extrabold">
            {business.business_name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">{business.business_name}</h1>
          <p className="text-sm text-muted-foreground">{business.category_name ?? t("app.storefront.defaultCategory")}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {business.public_location_label ?? business.location_text}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => void onShare()}>
            <Share2 className="mr-1 size-4" /> {t("app.storefront.share")}
          </Button>
          <Button type="button" size="sm" className="rounded-xl" onClick={() => void onFollow()}>
            {following ? "Following" : "Follow"}
          </Button>
        </div>
      </div>

      <p id="verification" className="mt-3 flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0" />
        <span>{business.is_verified ? t("app.storefront.verifiedInfo") : t("app.storefront.unverifiedInfo")}</span>
      </p>

      {business.description && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="leading-relaxed">{business.description}</p>
          <TranslateText text={business.description} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {business.public_phone && (
          <Button asChild className="min-h-11 rounded-xl">
            <a href={`tel:${business.public_phone}`}>
              <Phone className="mr-1.5 size-4" /> {t("app.storefront.call")}
            </a>
          </Button>
        )}
        {business.public_whatsapp && (
          <Button asChild variant="outline" className="min-h-11 rounded-xl">
            <a href={`https://wa.me/${business.public_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-1.5 size-4" /> {t("app.storefront.whatsapp")}
            </a>
          </Button>
        )}
        {directions && (
          <Button asChild variant="outline" className="min-h-11 rounded-xl">
            <a href={directions} target="_blank" rel="noreferrer">
              <Navigation className="mr-1.5 size-4" /> {t("app.storefront.directions")}
            </a>
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="rounded-xl" disabled={reporting} onClick={() => void onReport()}>
          <Flag className="mr-1 size-4" /> Report
        </Button>
      </div>

      {hours.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-bold">
            <Clock className="size-4" /> {t("app.storefront.openingHours")}{" "}
            <span className="text-xs font-normal text-muted-foreground">{t("app.storefront.ownerProvided")}</span>
          </h2>
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
            {hours.map(([k, label]) => (
              <li key={k} className="flex justify-between px-4 py-2 text-sm">
                <span>{label}</span>
                <span className="font-semibold">{business.opening_hours[k]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-bold">{t("app.storefront.productsTitle")}</h2>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("app.storefront.noProducts")}</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" loading="lazy" className="h-36 w-full object-cover" />
                )}
                <div className="p-3">
                  <Link to="/shop/p/$productId" params={{ productId: p.id }} className="font-bold leading-tight hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {p.kind === "service" ? t("app.storefront.service") : t("app.storefront.product")}
                  </p>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <TranslateText text={`${p.name}. ${p.description ?? ""}`.trim()} label={t("app.storefront.translateProduct")} />
                  <p className="mt-2 flex items-center justify-between">
                    <span className="font-extrabold">{p.sale_price != null ? formatNgn(p.sale_price) : t("app.storefront.priceOnRequest")}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.is_available ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"}`}
                    >
                      {p.is_available ? t("app.storefront.available") : t("app.storefront.outOfStock")}
                    </span>
                  </p>
                  {p.sale_price != null && p.is_available && (
                    <Button
                      type="button"
                      className="mt-2 min-h-10 w-full rounded-xl"
                      onClick={async () => {
                        if (!session || !profile) {
                          void navigate({ to: "/login" });
                          return;
                        }
                        const r = await addToCart(profile.id, {
                          businessId: p.business_id,
                          productId: p.id,
                          productName: p.name,
                          unit: p.unit,
                          unitPrice: Number(p.sale_price),
                          imageUrl: p.image_url,
                        });
                        if (r.error) toast.error(r.error);
                        else toast.success("Added to cart");
                      }}
                    >
                      Add to cart
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {videos.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">Shopping videos</h2>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {videos.map((v) => (
              <li key={v.id} className="overflow-hidden rounded-xl bg-muted">
                <Link to="/shop">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveCoverSrc(v.cover_path) ?? resolveVideoSrc(v)} alt="" className="aspect-[9/16] w-full object-cover" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">{t("app.storefront.enquiryTitle")}</h2>
        <form className="mt-3 space-y-2" onSubmit={(e) => void onEnquiry(e)}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("app.storefront.namePlaceholder")} className="min-h-11 rounded-xl" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("app.storefront.phonePlaceholder")} className="min-h-11 rounded-xl" />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("app.storefront.messagePlaceholder")}
            className="min-h-24 w-full rounded-xl border px-3 py-2 text-sm"
          />
          <VoiceTranslate language={voiceLang} onUseTranscript={(text) => setMessage((cur) => (cur ? `${cur} ${text}` : text))} />
          <Button type="submit" className="min-h-11 w-full rounded-xl" disabled={sending}>
            {sending ? t("app.storefront.sending") : t("app.storefront.sendMessage")}
          </Button>
        </form>
      </section>
    </div>
  );
}
