"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { fetchCart, removeCartItem, updateCartItemQuantity } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";

export function CartScreen() {
  const { profile, session } = useAuth();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["marketplace-cart", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const res = await fetchCart(profile!.id);
      if (res.error) throw new Error(res.error);
      return res.items;
    },
  });

  const items = cartQuery.data ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const cartCount = items.reduce((n, i) => n + Number(i.quantity), 0);

  const bySeller = new Map<string, typeof items>();
  for (const item of items) {
    const list = bySeller.get(item.business_id) ?? [];
    list.push(item);
    bySeller.set(item.business_id, list);
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
  }

  if (!session) {
    return (
      <MarketplaceShell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-bold">Sign in to view your cart</p>
          <Button className="mt-4 rounded-xl font-bold" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell cartCount={cartCount}>
      <h1 className="text-xl font-extrabold">Your cart</h1>
      {cartQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {!cartQuery.isLoading && items.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-semibold">Cart is empty</p>
          <Button className="mt-4 rounded-xl font-bold" asChild>
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {[...bySeller.entries()].map(([bizId, sellerItems]) => (
          <section key={bizId} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Seller order
            </p>
            <ul className="mt-2 divide-y divide-border">
              {sellerItems.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{item.product_name}</p>
                    <p className="text-sm font-semibold text-primary">
                      {formatNgn(Number(item.unit_price))}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg"
                        onClick={async () => {
                          const { error } = await updateCartItemQuantity(
                            item.id,
                            Number(item.quantity) - 1,
                          );
                          if (error) toast.error(error);
                          else void refresh();
                        }}
                      >
                        −
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg"
                        onClick={async () => {
                          const { error } = await updateCartItemQuantity(
                            item.id,
                            Number(item.quantity) + 1,
                          );
                          if (error) toast.error(error);
                          else void refresh();
                        }}
                      >
                        +
                      </Button>
                      <button
                        type="button"
                        className="ml-auto text-xs font-semibold text-destructive"
                        onClick={async () => {
                          const { error } = await removeCartItem(item.id);
                          if (error) toast.error(error);
                          else void refresh();
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-extrabold">{formatNgn(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Delivery fees are calculated per seller at checkout.
          </p>
          <Button className="mt-4 min-h-12 w-full rounded-xl font-bold" asChild>
            <Link to="/shop/checkout">Proceed to checkout</Link>
          </Button>
        </div>
      )}
    </MarketplaceShell>
  );
}
