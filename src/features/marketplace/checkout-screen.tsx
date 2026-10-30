"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Lock, MapPin, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { TijarLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { isMockFeedId } from "@/features/marketplace/feed-mock";
import { haptic } from "@/lib/haptics";
import { clearLocalCart, listLocalCart } from "@/lib/local-cart";
import { cn } from "@/lib/utils";
import {
  fetchCart,
  listAddresses,
  placeOrders,
  saveAddress,
  startFlutterwavePay,
} from "@/services/marketplace-service";
import type { CartItem } from "@/types/database";
import { formatNgn } from "@/utils/money";

type PayMethod = "flutterwave" | "transfer" | "pod";

const ngnExact = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(n: number): string {
  return ngnExact.format(n);
}

function checkoutKey(): string {
  const existing = sessionStorage.getItem("tijar-checkout-key");
  if (existing) return existing;
  const key = crypto.randomUUID();
  sessionStorage.setItem("tijar-checkout-key", key);
  return key;
}

function CardMarks() {
  return (
    <span className="flex items-center gap-1.5" aria-hidden>
      <span className="rounded px-1 py-0.5 text-[9px] font-black tracking-tight text-[#1A1F71]" style={{ fontFamily: "Arial, sans-serif" }}>
        VISA
      </span>
      <span className="relative inline-flex h-4 w-7 items-center justify-center">
        <span className="absolute left-0 size-3.5 rounded-full bg-[#EB001B]" />
        <span className="absolute right-0 size-3.5 rounded-full bg-[#F79E1B]" />
      </span>
      <span className="rounded bg-[#1F7A4D] px-1 py-0.5 text-[8px] font-black tracking-wide text-white">VERVE</span>
    </span>
  );
}

export function CheckoutScreen() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const actorId = profile?.id ?? "guest";
  const payStatus = useQuery({
    queryKey: ["payments-status"],
    queryFn: async () => {
      const res = await fetch("/api/payments/status");
      return (await res.json()) as { ready?: boolean };
    },
  });
  const paymentReady = Boolean(payStatus.data?.ready);

  const [pay, setPay] = useState<PayMethod>("transfer");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<CartItem[]>([]);
  const [addr, setAddr] = useState({
    full_name: profile?.full_name?.trim() || "",
    phone: profile?.phone?.trim() || "",
    state: "",
    city: "",
    lga: "",
    street: "",
    country: "Nigeria",
  });

  const cartQuery = useQuery({
    queryKey: ["marketplace-cart-v2", actorId],
    queryFn: async () => {
      const res = await fetchCart(actorId);
      if (res.error && res.items.length === 0) throw new Error(res.error);
      return res.items;
    },
  });

  const addressQuery = useQuery({
    queryKey: ["customer-addresses", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => (await listAddresses(profile!.id)).data,
  });

  useEffect(() => {
    setLocalItems(listLocalCart(actorId));
  }, [actorId, cartQuery.dataUpdatedAt]);

  useEffect(() => {
    const saved = addressQuery.data?.find((a) => a.is_default) ?? addressQuery.data?.[0];
    if (!saved) return;
    setAddr((cur) => ({
      ...cur,
      full_name: saved.full_name || cur.full_name,
      phone: saved.phone || cur.phone,
      state: saved.state || cur.state,
      city: saved.city || cur.city,
      lga: saved.lga || cur.lga,
      street: saved.street || cur.street,
    }));
  }, [addressQuery.data]);

  const items = cartQuery.data && cartQuery.data.length > 0 ? cartQuery.data : localItems;
  const goods = useMemo(() => items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0), [items]);
  const shipping = 2_500;
  const tax = goods >= 50_000 ? 4_000 : Math.round(goods * 0.075);
  const subtotal = Math.max(0, goods - shipping - tax);
  const total = goods;

  async function placeOrder() {
    setError(null);
    if (items.length === 0) {
      setError("Your cart is empty.");
      toast.error("Your cart is empty.");
      return;
    }
    if (!addr.full_name.trim() || !addr.street.trim() || !addr.phone.trim()) {
      setError("Add a delivery name, address, and phone.");
      toast.error("Add a delivery name, address, and phone.");
      setEditing(true);
      return;
    }
    haptic("success");
    setBusy(true);

    const note = `Pay: ${pay === "flutterwave" ? "Flutterwave" : pay === "transfer" ? "Transfer to shop" : "Pay on delivery"} · ${addr.street}`;

    if (!profile) {
      setBusy(false);
      toast.error("Sign in to place an order.");
      void navigate({ to: "/login" });
      return;
    }
    if (items.some((i) => isMockFeedId(i.product_id) || isMockFeedId(i.id))) {
      setBusy(false);
      toast.error("Remove unavailable demo items from your cart.");
      return;
    }
    if (pay === "flutterwave" && !paymentReady) {
      setBusy(false);
      toast.error("Online pay is not live yet. Transfer to the shop instead.");
      return;
    }

    const saved = await saveAddress(profile.id, {
      label: "Delivery",
      full_name: addr.full_name,
      phone: addr.phone,
      state: addr.state,
      city: addr.city,
      lga: addr.lga || null,
      street: addr.street,
      instructions: null,
      is_default: true,
    });
    if (saved.error) {
      setBusy(false);
      setError(saved.error);
      toast.error(saved.error);
      return;
    }
    const list = await listAddresses(profile.id);
    const addressId = list.data.find((a) => a.is_default)?.id ?? list.data[0]?.id ?? null;
    const placed = await placeOrders({
      fulfilment: "seller_delivery",
      addressId,
      buyerNote: note,
      buyerPhone: addr.phone,
      idempotencyKey: checkoutKey(),
      paymentMethod: pay,
      paymentDestination: pay === "flutterwave" ? "platform" : pay === "transfer" ? "seller" : "pod",
    });
    if (placed.error || placed.orders.length === 0) {
      setBusy(false);
      const message = placed.error || "Could not place the order. Try again.";
      setError(message);
      toast.error(message);
      return;
    }
    sessionStorage.removeItem("tijar-checkout-key");
    clearLocalCart(actorId);
    await queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
    await queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
    if (pay === "flutterwave") {
      const flw = await startFlutterwavePay(placed.orders[0]!.id);
      setBusy(false);
      if (flw.error || !flw.link) {
        toast.error(flw.error ?? "Order placed. Open My Orders to try Flutterwave again.");
        void navigate({ to: "/shop/orders/$orderId", params: { orderId: placed.orders[0]!.id } });
        return;
      }
      window.location.assign(flw.link);
      return;
    }

    setBusy(false);
    toast.success(
      pay === "transfer"
        ? "Order placed. Transfer to the shop account on the next screen."
        : "Order placed. The seller will confirm. Track it in My Orders.",
    );
    void navigate({ to: "/shop/orders/$orderId", params: { orderId: placed.orders[0]!.id } });
  }

  return (
    <MarketplaceShell hideTopBar hideNav variant="feed">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1 pt-[max(0.45rem,env(safe-area-inset-top))]">
          <Link to="/shop" className="block w-[7.5rem]" aria-label="TIJAR home">
            <TijarLogo compact />
          </Link>
          <p className="flex items-center gap-1 text-[12px] font-semibold text-[#1F7A4D]">
            <ShieldCheck className="size-4" aria-hidden />
            Secure Checkout
          </p>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <h1 className="pt-2 text-[1.85rem] font-extrabold leading-none tracking-tight text-[#0B1F4D]">Checkout</h1>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#6B7280]">
            <ShieldCheck className="size-4 text-[#1F7A4D]" aria-hidden />
            Your order is secure and encrypted
          </p>

          {items.length === 0 && cartQuery.isLoading ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">Loading checkout…</p>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed p-6 text-center">
              <p className="font-extrabold text-[#0B1F4D]">Nothing to checkout</p>
              <p className="mt-1 text-sm text-muted-foreground">Add items to your cart first.</p>
              <Button className="mt-4 rounded-xl bg-[#0B1F4D]" asChild>
                <Link to="/shop/cart">Back to cart</Link>
              </Button>
            </div>
          ) : (
            <>
              <section className="mt-5" aria-labelledby="addr-heading">
                <div className="flex items-center justify-between">
                  <h2 id="addr-heading" className="flex items-center gap-1.5 text-[15px] font-extrabold text-[#1F7A4D]">
                    <MapPin className="size-4" />
                    Delivery Address
                  </h2>
                  <button
                    type="button"
                    className="text-[13px] font-bold text-[#1F7A4D]"
                    onClick={() => setEditing((v) => !v)}
                  >
                    Change
                  </button>
                </div>
                {editing ? (
                  <div className="mt-2 space-y-2 rounded-2xl border border-[#EEF1F5] p-3">
                    <Input className="min-h-11 rounded-xl" value={addr.full_name} onChange={(e) => setAddr({ ...addr, full_name: e.target.value })} placeholder="Full name" aria-label="Full name" />
                    <Input className="min-h-11 rounded-xl" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} placeholder="Street address" aria-label="Street address" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input className="min-h-11 rounded-xl" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder="City" aria-label="City" />
                      <Input className="min-h-11 rounded-xl" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} placeholder="State" aria-label="State" />
                    </div>
                    <Input className="min-h-11 rounded-xl" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} placeholder="Phone" aria-label="Phone" inputMode="tel" />
                    <Button type="button" className="min-h-10 w-full rounded-xl bg-[#0B1F4D]" onClick={() => setEditing(false)}>
                      Save address
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2.5 rounded-2xl border border-[#EEF1F5] p-3.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[#1F7A4D]" aria-hidden />
                    <address className="min-w-0 text-[13px] not-italic leading-snug text-[#374151]">
                      <span className="font-extrabold text-[#0B1F4D]">{addr.full_name}</span>
                      <span className="mt-0.5 block">{addr.street}</span>
                      <span className="block">
                        {addr.state}, {addr.country}
                      </span>
                      <span className="mt-0.5 block">{addr.phone}</span>
                    </address>
                  </div>
                )}
              </section>

              <section className="mt-5" aria-labelledby="pay-heading">
                <h2 id="pay-heading" className="flex items-center gap-1.5 text-[15px] font-extrabold text-[#0B1F4D]">
                  <WalletCards className="size-4 text-[#1F7A4D]" />
                  Payment Method
                </h2>
                <div className="mt-2 overflow-hidden rounded-2xl border border-[#EEF1F5]" role="radiogroup" aria-label="Payment method">
                  <PayRow
                    selected={pay === "transfer"}
                    onSelect={() => setPay("transfer")}
                    title="Transfer to shop"
                    subtitle="Pay directly into the seller’s bank account"
                    chevron
                  />
                  <PayRow
                    selected={pay === "flutterwave"}
                    onSelect={() => setPay("flutterwave")}
                    title="Pay online (Flutterwave)"
                    subtitle={paymentReady ? "Card, bank, USSD — shop requests payout later" : "Goes live when Flutterwave keys are on the server"}
                    trailing={<CardMarks />}
                  />
                  <PayRow
                    selected={pay === "pod"}
                    onSelect={() => setPay("pod")}
                    title="Pay on Delivery"
                    subtitle="Cash or card on delivery"
                    chevron
                    last
                  />
                </div>
                {pay === "flutterwave" ? (
                  <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                    {paymentReady
                      ? "You will finish payment on Flutterwave. TIJAR never stores card numbers. The shop can request a payout anytime."
                      : "Online pay is not live yet. Transfer to the shop, or add Flutterwave keys on the server."}
                  </p>
                ) : null}
                {pay === "transfer" ? (
                  <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                    After the seller confirms, they send the account to pay. Do not transfer to a number you were not given in TIJAR chat.
                  </p>
                ) : null}
                {pay === "pod" ? (
                  <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                    Pay with cash or a POS when the order arrives. Inspect the item before you pay.
                  </p>
                ) : null}
              </section>

              <section className="mt-5" aria-labelledby="sum-heading">
                <h2 id="sum-heading" className="flex items-center gap-1.5 text-[15px] font-extrabold text-[#0B1F4D]">
                  <span className="inline-flex size-4 items-center justify-center rounded-sm border-2 border-[#1F7A4D] text-[9px] font-black text-[#1F7A4D]" aria-hidden>
                    ≡
                  </span>
                  Order Summary
                </h2>
                <dl className="mt-2 space-y-2.5 rounded-2xl border border-[#EEF1F5] p-4 text-[14px]">
                  <div className="flex justify-between">
                    <dt className="text-[#6B7280]">Subtotal</dt>
                    <dd className="font-semibold text-[#0B1F4D]">{money(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#6B7280]">Shipping</dt>
                    <dd className="font-semibold text-[#0B1F4D]">{money(shipping)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#6B7280]">Tax</dt>
                    <dd className="font-semibold text-[#0B1F4D]">{money(tax)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[#EEF1F5] pt-2.5">
                    <dt className="font-extrabold text-[#0B1F4D]">Total</dt>
                    <dd className="text-[16px] font-extrabold text-[#1F7A4D]">{money(total)}</dd>
                  </div>
                </dl>
              </section>

              {error ? (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <p className="mt-4 flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                <Lock className="size-3.5 text-[#1F7A4D]" aria-hidden />
                All transactions are secure and encrypted.
              </p>

              <Button
                type="button"
                className="mt-3 min-h-[3.15rem] w-full rounded-xl bg-[#1F7A4D] text-[16px] font-extrabold text-white hover:bg-[#1F7A4D]/90"
                disabled={busy || items.length === 0}
                onClick={() => void placeOrder()}
              >
                <ShieldCheck className="mr-1.5 size-5" />
                {busy ? "Placing…" : "Place Order"}
                <span className="ml-auto pl-3">{formatNgn(total)}</span>
              </Button>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[12px] text-[#6B7280]">
                <Lock className="size-3.5" aria-hidden />
                Secure payment powered by <span className="font-extrabold text-[#1F7A4D]">TIJAR</span>
              </p>
            </>
          )}
        </div>
      </div>
    </MarketplaceShell>
  );
}

function PayRow({
  selected,
  onSelect,
  title,
  subtitle,
  trailing,
  chevron,
  last,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  chevron?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn("flex w-full items-center gap-3 px-3 py-3 text-left", !last && "border-b border-[#EEF1F5]")}
    >
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-[#1F7A4D]" : "border-[#D1D5DB]",
        )}
        aria-hidden
      >
        {selected ? <span className="size-2.5 rounded-full bg-[#1F7A4D]" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold text-[#0B1F4D]">{title}</span>
        <span className="block text-[12px] text-[#9CA3AF]">{subtitle}</span>
      </span>
      {trailing}
      {chevron ? <ChevronRight className="size-4 shrink-0 text-[#D1D5DB]" aria-hidden /> : null}
    </button>
  );
}
