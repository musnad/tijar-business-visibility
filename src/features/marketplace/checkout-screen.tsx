"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import {
  completeTestPayment,
  fetchCart,
  listAddresses,
  placeOrders,
  saveAddress,
} from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";

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

  const items = cartQuery.data ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);

  async function pay() {
    if (!profile) return;
    if (items.length === 0) {
      toast.error("Cart is empty");
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

    const placed = await placeOrders({
      fulfilment,
      addressId,
      buyerNote: note,
      buyerPhone: addr.phone || profile.phone || undefined,
    });
    if (placed.error || placed.orders.length === 0) {
      toast.error(placed.error ?? "Could not place order");
      setBusy(false);
      return;
    }

    // Development / unconfigured provider: clearly labeled TEST payment
    for (const order of placed.orders) {
      const paid = await completeTestPayment(order.id);
      if (paid.error) {
        toast.message(`Order ${order.order_number} created — payment pending (test mode failed: ${paid.error})`);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
    await queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
    setBusy(false);
    toast.success("Your order has been placed successfully! (Test payment)");
    void navigate({ to: "/shop/orders" });
  }

  if (!profile) {
    return (
      <MarketplaceShell>
        <p className="text-center">
          <Link to="/login" className="font-bold text-teal-800">
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
      <p className="mt-1 text-xs text-amber-800">
        Payment is in <strong>TEST MODE</strong> until Paystack/Flutterwave is configured. This is not a real charge.
      </p>

      <section className="mt-4 rounded-2xl border border-border bg-white p-4">
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
        <section className="mt-4 space-y-2 rounded-2xl border border-border bg-white p-4">
          <p className="text-sm font-bold">Delivery address</p>
          <Input placeholder="Full name" value={addr.full_name} onChange={(e) => setAddr({ ...addr, full_name: e.target.value })} />
          <Input placeholder="Phone" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
          <Input placeholder="State" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
          <Input placeholder="City / town" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
          <Input placeholder="LGA" value={addr.lga} onChange={(e) => setAddr({ ...addr, lga: e.target.value })} />
          <Input placeholder="Street address" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-border bg-white p-4">
        <p className="text-sm font-bold">Order review</p>
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
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-extrabold">
          <span>Total</span>
          <span>{formatNgn(subtotal)}</span>
        </div>
        <Input
          className="mt-3"
          placeholder="Note to sellers (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </section>

      <Button
        type="button"
        className="mt-4 min-h-12 w-full rounded-xl bg-teal-700 font-bold hover:bg-teal-800"
        disabled={busy || items.length === 0}
        onClick={() => void pay()}
      >
        {busy ? "Placing order…" : "Pay with TEST mode"}
      </Button>
    </MarketplaceShell>
  );
}
