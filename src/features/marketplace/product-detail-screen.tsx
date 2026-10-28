"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, ShoppingCart, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import {
  addToCart,
  fetchCart,
  fetchMarketplaceProduct,
  toggleFavoriteProduct,
} from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";

export function ProductDetailScreen({ productId }: { productId: string }) {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);

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
    if (product.sale_price == null) {
      toast.message("This product has no price yet.");
      return;
    }
    const { error } = await addToCart(profile.id, {
      businessId: product.business_id,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      unitPrice: Number(product.sale_price),
      quantity: qty,
      imageUrl: product.image_url,
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
              <p className="mt-1 text-2xl font-extrabold text-primary">
                {product.sale_price != null ? formatNgn(Number(product.sale_price)) : "Ask seller"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {product.is_available ? "In stock" : "Unavailable"} · {product.unit}
                {product.category_name ? ` · ${product.category_name}` : ""}
              </p>
              {product.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
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
