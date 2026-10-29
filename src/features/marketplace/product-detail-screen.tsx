"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, ShoppingCart, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { formatServiceDates, serviceLabel } from "@/lib/catalogue/service-schedule";
import { parseVariantList } from "@/lib/catalogue/variants";
import {
  addToCart,
  fetchCart,
  fetchMarketplaceProduct,
  toggleFavoriteProduct,
} from "@/services/marketplace-service";
import { enrollInService } from "@/services/customer-service";
import { formatNgn } from "@/utils/money";

export function ProductDetailScreen({ productId }: { productId: string }) {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string>("");

  const productQuery = useQuery({
    queryKey: ["marketplace-product", productId],
    queryFn: async () => {
      const res = await fetchMarketplaceProduct(productId);
      if (res.error) throw new Error(res.error);
      return res.product;
    },
  });

  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });

  const product = productQuery.data;
  const variants = parseVariantList(product?.variants);
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  const livePrice =
    product?.sale_price == null ? null : Number(product.sale_price) + (selectedVariant?.price_delta ?? 0);
  const cartCount = cartQuery.data?.reduce((n, i) => n + Number(i.quantity), 0) ?? 0;

  async function requireAuth() {
    if (!session || !profile) {
      toast.message("Sign in to continue.");
      void navigate({ to: "/login" });
      return false;
    }
    return true;
  }

  async function add(buyNow = false) {
    if (!(await requireAuth()) || !product || !profile) return;
    if (livePrice == null) {
      toast.message("This product has no price yet. Send an enquiry from the storefront.");
      return;
    }
    const { error } = await addToCart(profile.id, {
      businessId: product.business_id,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      unitPrice: livePrice,
      quantity: qty,
      imageUrl: product.image_url,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
    });
    if (error) {
      toast.error(error);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
    if (buyNow) void navigate({ to: "/shop/checkout" });
    else toast.success("Added to cart");
  }

  async function favorite() {
    if (!(await requireAuth()) || !profile) return;
    const { favorited, error } = await toggleFavoriteProduct(profile.id, productId);
    if (error) toast.error(error);
    else toast.success(favorited ? "Saved to favorites" : "Removed from favorites");
  }

  return (
    <MarketplaceShell cartCount={cartCount}>
      {productQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {productQuery.isError && (
        <p className="text-sm text-destructive">Could not load this product.</p>
      )}
      {product && (
        <div className="space-y-4 pb-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="aspect-[4/3] bg-muted">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                  No photo
                </div>
              )}
            </div>
            <div className="p-4">
              <h1 className="text-xl font-extrabold leading-tight">{product.name}</h1>
              {serviceLabel(product) && (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {serviceLabel(product)}
                  {formatServiceDates(product) ? ` · ${formatServiceDates(product)}` : ""}
                </p>
              )}
              <p className="mt-1 text-2xl font-extrabold text-primary">
                {livePrice != null ? formatNgn(livePrice) : "Ask seller"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.kind === "service"
                  ? "Open for enrolment"
                  : product.is_available
                    ? "In stock"
                    : "Unavailable"}{" "}
                · {product.unit}
                {product.category_name ? ` · ${product.category_name}` : ""}
                {product.currency ? ` · ${product.currency}` : ""}
              </p>
              {product.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              )}
              {variants.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        (selectedVariant?.id ?? "") === v.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                      onClick={() => setVariantId(v.id)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Store className="size-4 text-primary" /> {product.business_name ?? "Seller"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Informal TIJAR business</p>
            {product.business_slug && (
              <Link
                to="/b/$slug"
                params={{ slug: product.business_slug }}
                className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                View business profile
              </Link>
            )}
          </div>

          {product.kind === "service" && <ServiceEnrollForm productId={product.id} />}

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <span className="text-sm font-semibold">Qty</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-xl"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </Button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-xl"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-12 rounded-xl font-bold"
              onClick={() => void favorite()}
            >
              <Heart className="mr-1.5 size-4" /> Save
            </Button>
            <Button type="button" className="min-h-12 rounded-xl font-bold" onClick={() => void add(false)}>
              <ShoppingCart className="mr-1.5 size-4" /> Add to cart
            </Button>
          </div>
          <Button
            type="button"
            className="min-h-12 w-full rounded-xl font-bold"
            onClick={() => void add(true)}
          >
            Buy now
          </Button>
        </div>
      )}
    </MarketplaceShell>
  );
}

function ServiceEnrollForm({ productId }: { productId: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { error } = await enrollInService({ productId, fullName, email, phone });
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Enrolment sent. The business now has your details.");
    setFullName("");
    setEmail("");
    setPhone("");
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-4">
      <h2 className="text-sm font-extrabold">Enrol with your details</h2>
      <p className="mt-1 text-xs text-muted-foreground">Name plus email or phone. The seller gets this on their customer list.</p>
      <Input className="mt-3 min-h-11 rounded-xl" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
      <Input className="mt-2 min-h-11 rounded-xl" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Input className="mt-2 min-h-11 rounded-xl" placeholder="Phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      <Button type="button" className="mt-3 min-h-11 w-full rounded-xl font-bold" disabled={busy} onClick={() => void submit()}>
        Enrol
      </Button>
    </div>
  );
}
