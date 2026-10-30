"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { isMockFeedId } from "@/features/marketplace/feed-mock";
import { useAuth } from "@/features/auth/auth-context";
import { placeLocalOrder } from "@/lib/shop-social";
import { addToCart, fetchMarketplaceProduct, placeOrders } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";

export function BuyScreen({ productId }: { productId?: string }) {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);
  const [fulfilment, setFulfilment] = useState<"pickup" | "seller_delivery">("pickup");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const productQuery = useQuery({
    queryKey: ["marketplace-product", productId],
    enabled: Boolean(productId),
    queryFn: async () => {
      const r = await fetchMarketplaceProduct(productId!);
      if (r.error) throw new Error(r.error);
      if (!r.product) throw new Error("This product is not available.");
      return r.product;
    },
  });

  const product = productQuery.data;
  const total = product?.sale_price != null ? Number(product.sale_price) * qty + (fulfilment === "seller_delivery" ? 1500 : 0) : 0;

  async function confirm() {
    if (!product || product.sale_price == null) {
      toast.error("This listing has no price.");
      return;
    }
    setBusy(true);
    if (isMockFeedId(product.id) || !session || !profile) {
      const placed = placeLocalOrder({
        profileId: profile?.id ?? "guest",
        product,
        quantity: qty,
        fulfilment,
        buyerPhone: phone,
        buyerNote: note,
      });
      await queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      toast.success("Order placed. Track it in My Orders.");
      setBusy(false);
      void navigate({ to: "/shop/orders/$orderId", params: { orderId: placed.order.id } });
      return;
    }

    const added = await addToCart(profile.id, {
      businessId: product.business_id,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      unitPrice: Number(product.sale_price),
      quantity: qty,
      imageUrl: product.image_url,
    });
    if (added.error) {
      toast.error(added.error);
      setBusy(false);
      return;
    }
    const placed = await placeOrders({
      fulfilment,
      buyerNote: note,
      buyerPhone: phone,
      idempotencyKey: crypto.randomUUID(),
    });
    setBusy(false);
    if (placed.error || placed.orders.length === 0) {
      toast.error(placed.error ?? "Could not place order. Try checkout from cart.");
      void navigate({ to: "/shop/checkout" });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
    toast.success("Order request sent. Track it in My Orders.");
    void navigate({ to: "/shop/orders/$orderId", params: { orderId: placed.orders[0]!.id } });
  }

  return (
    <MarketplaceShell hideTopBar variant="feed">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="flex items-center gap-2 px-3 py-2">
          <button type="button" className="flex size-10 items-center justify-center" onClick={() => history.back()} aria-label="Back">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-lg font-extrabold text-[#0B1F4D]">Buy</h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {!productId ? (
            <p className="text-sm text-muted-foreground">
              Pick a product first.{" "}
              <Link to="/shop" className="font-bold text-primary">
                Browse
              </Link>
            </p>
          ) : productQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !product ? (
            <p className="text-sm text-destructive">Product not found.</p>
          ) : (
            <>
              <div className="flex gap-3 rounded-2xl border border-border p-3">
                <div className="size-20 overflow-hidden rounded-xl bg-muted">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[#0B1F4D]">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.business_name}</p>
                  <p className="mt-1 font-extrabold text-[#1F7A4D]">{formatNgn(Number(product.sale_price))}</p>
                </div>
              </div>

              <label className="mt-4 block text-sm font-bold">Quantity</label>
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" className="size-10 rounded-xl p-0" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                  −
                </Button>
                <span className="w-8 text-center font-extrabold">{qty}</span>
                <Button type="button" variant="outline" className="size-10 rounded-xl p-0" onClick={() => setQty((n) => n + 1)}>
                  +
                </Button>
              </div>

              <p className="mt-4 text-sm font-bold">How you will get it</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" variant={fulfilment === "pickup" ? "default" : "outline"} className="rounded-xl" onClick={() => setFulfilment("pickup")}>
                  Pickup
                </Button>
                <Button type="button" variant={fulfilment === "seller_delivery" ? "default" : "outline"} className="rounded-xl" onClick={() => setFulfilment("seller_delivery")}>
                  Delivery
                </Button>
              </div>

              <label className="mt-4 block text-sm font-bold">Phone</label>
              <Input className="mt-1 min-h-11 rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For the seller to reach you" />
              <label className="mt-3 block text-sm font-bold">Note (optional)</label>
              <Input className="mt-1 min-h-11 rounded-xl" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Colour, size, pickup time…" />

              <div className="mt-5 flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-extrabold text-[#0B1F4D]">{formatNgn(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Payment providers are not charged from this screen. This creates an order you can track in My Orders.
              </p>
              <Button type="button" className="mt-4 min-h-12 w-full rounded-xl bg-[#1F7A4D] font-extrabold" disabled={busy} onClick={() => void confirm()}>
                {busy ? "Placing…" : "Place order"}
              </Button>
            </>
          )}
        </div>
      </div>
    </MarketplaceShell>
  );
}
