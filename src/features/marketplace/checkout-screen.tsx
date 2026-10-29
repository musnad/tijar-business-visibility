"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { quoteHasUnavailable, type CheckoutQuote } from "@/lib/checkout/quote";
import { isLivePaymentConfigured } from "@/lib/payments/adapter";
import {
  fetchCart,
  listAddresses,
  placeOrders,
  quoteCheckout,
  saveAddress,
} from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";

function checkoutKey(): string {
  const existing = sessionStorage.getItem("tijar-checkout-key");
  if (existing) return existing;
  const key = crypto.randomUUID();
  sessionStorage.setItem("tijar-checkout-key", key);
  return key;
}

export function CheckoutScreen() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fulfilment, setFulfilment] = useState<"pickup" | "seller_delivery">("pickup");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [addr, setAddr] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    state: "Kano",
    city: "Kano",
    lga: "",
    street: "",
    instructions: "",
  });

  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await fetchCart(profile!.id)).items,
  });

  const quoteQuery = useQuery({
    queryKey: ["marketplace-quote", profile?.id, fulfilment],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const r = await quoteCheckout(fulfilment);
      if (r.error) throw new Error(r.error);
      return r.quote as CheckoutQuote;
    },
  });

  const items = cartQuery.data ?? [];
  const quote = quoteQuery.data;
  const paymentReady = isLivePaymentConfigured();
  const blocked = quote ? quoteHasUnavailable(quote) : false;

  const fallbackTotal = useMemo(
    () => items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0),
    [items],
  );

  async function submitRequest() {
    if (!profile) return;
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (blocked) {
      toast.error("Some items are unavailable. Update the cart first.");
      return;
    }
    setBusy(true);
    let addressId: string | null = null;
    if (fulfilment === "seller_delivery") {
      if (!addr.street.trim() || !addr.phone.trim()) {
        toast.error("Add a delivery address and phone.");
        setBusy(false);
        return;
      }
      const saved = await saveAddress(profile.id, {
        label: "Delivery",
        full_name: addr.full_name || profile.full_name,
        phone: addr.phone,
        state: addr.state,
        city: addr.city,
        lga: addr.lga || null,
        street: addr.street,
        instructions: addr.instructions || null,
        is_default: true,
      });
      if (saved.error) {
        toast.error(saved.error);
        setBusy(false);
        return;
      }
      const list = await listAddresses(profile.id);
      addressId = list.data.find((a) => a.is_default)?.id ?? list.data[0]?.id ?? null;
    }

    const buyerPhone = addr.phone.trim() || profile.phone?.trim() || "";
    const placed = await placeOrders({
      fulfilment,
      addressId,
      buyerNote: note,
      idempotencyKey: checkoutKey(),
      ...(buyerPhone ? { buyerPhone } : {}),
    });
    if (placed.error || placed.orders.length === 0) {
      toast.error(placed.error ?? "Could not send the order request");
      setBusy(false);
      return;
    }

    sessionStorage.removeItem("tijar-checkout-key");
    await queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
    await queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
    setBusy(false);
    toast.success(
      paymentReady
        ? "Order placed. Complete payment with the provider to mark it paid."
        : `${placed.orders.length} order request${placed.orders.length === 1 ? "" : "s"} sent. Not paid — the seller will confirm.`,
    );
    void navigate({ to: "/shop/orders" });
  }

  if (!profile) {
    return (
      <MarketplaceShell>
        <p className="text-center text-sm">
          <Link to="/login" className="font-bold text-primary">
            Sign in
          </Link>{" "}
          to checkout.
        </p>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell cartCount={items.reduce((n, i) => n + Number(i.quantity), 0)}>
      <h1 className="text-xl font-extrabold">Checkout</h1>
      <p className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {paymentReady
          ? "Live payment is configured on the server. An order is paid only after the provider webhook succeeds — never from this screen."
          : "Paystack / Flutterwave are not connected. This sends a labelled order request. It is not a completed payment."}
      </p>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-bold">Delivery method</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={fulfilment === "pickup" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setFulfilment("pickup")}
          >
            Pickup
          </Button>
          <Button
            type="button"
            variant={fulfilment === "seller_delivery" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setFulfilment("seller_delivery")}
          >
            Seller delivery
          </Button>
        </div>
      </section>

      {fulfilment === "seller_delivery" && (
        <section className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-bold">Delivery address</p>
          <Input placeholder="Full name" value={addr.full_name} onChange={(e) => setAddr({ ...addr, full_name: e.target.value })} className="min-h-11 rounded-xl" />
          <Input placeholder="Phone" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} className="min-h-11 rounded-xl" />
          <Input placeholder="State" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} className="min-h-11 rounded-xl" />
          <Input placeholder="City / town" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className="min-h-11 rounded-xl" />
          <Input placeholder="LGA" value={addr.lga} onChange={(e) => setAddr({ ...addr, lga: e.target.value })} className="min-h-11 rounded-xl" />
          <Input placeholder="Street address" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} className="min-h-11 rounded-xl" />
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-bold">Order review by seller</p>
        {quoteQuery.isError && (
          <p className="mt-2 text-xs text-amber-800">
            Live quote RPC is not applied yet. Showing cart lines. Run migration 000020 so prices are recalculated on the server.
          </p>
        )}
        {(quote?.sellers ?? []).map((seller) => (
          <div key={seller.business_id} className="mt-3 border-t border-border pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{seller.business_name}</p>
            <ul className="mt-1 space-y-1 text-sm">
              {seller.lines.map((line) => (
                <li key={`${line.product_id}-${line.variant_label ?? ""}`} className="flex justify-between gap-2">
                  <span className="truncate">
                    {line.product_name}
                    {line.variant_label ? ` (${line.variant_label})` : ""} × {line.quantity}
                    {!line.available ? " — unavailable" : ""}
                  </span>
                  <span className="font-semibold">{formatNgn(line.line_total)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Delivery</span>
              <span>{formatNgn(seller.delivery_fee)}</span>
            </p>
          </div>
        ))}
        {!quote && items.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {i.product_name} × {i.quantity}
                </span>
                <span className="font-semibold">{formatNgn(Number(i.quantity) * Number(i.unit_price))}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <p className="flex justify-between">
            <span>Items</span>
            <span>{formatNgn(quote?.subtotal ?? fallbackTotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>Delivery fees</span>
            <span>{formatNgn(quote?.delivery_fee ?? 0)}</span>
          </p>
          <p className="flex justify-between">
            <span>Payment charges</span>
            <span>{formatNgn(quote?.payment_fee ?? 0)}</span>
          </p>
          <p className="flex justify-between font-extrabold">
            <span>Total</span>
            <span className="text-primary">{formatNgn(quote?.total ?? fallbackTotal)}</span>
          </p>
        </div>
        <Input
          className="mt-3 min-h-11 rounded-xl"
          placeholder="Note to sellers (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </section>

      <Button
        type="button"
        className="mt-4 min-h-12 w-full rounded-xl font-bold"
        disabled={busy || items.length === 0 || blocked}
        onClick={() => void submitRequest()}
      >
        {busy ? "Sending…" : paymentReady ? "Place order (pay with provider)" : "Send order request"}
      </Button>
    </MarketplaceShell>
  );
}
