"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { fetchMyOrders } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";

export function OrdersScreen() {
  const { session } = useAuth();
  const ordersQuery = useQuery({
    queryKey: ["marketplace-orders"],
    enabled: Boolean(session),
    queryFn: async () => {
      const res = await fetchMyOrders();
      if (res.error) throw new Error(res.error);
      return res.orders;
    },
  });

  if (!session) {
    return (
      <MarketplaceShell>
        <p className="text-center text-sm">
          <Link to="/login" className="font-bold text-teal-800">
            Sign in
          </Link>{" "}
          to see your orders.
        </p>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell>
      <h1 className="text-xl font-extrabold">My orders</h1>
      {ordersQuery.isLoading && <p className="mt-4 text-muted-foreground">Loading…</p>}
      {ordersQuery.isError && (
        <p className="mt-4 text-sm text-destructive">
          Could not load orders. Apply the marketplace migration in Supabase.
        </p>
      )}
      {!ordersQuery.isLoading && (ordersQuery.data?.length ?? 0) === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(ordersQuery.data ?? []).map((o) => (
          <li key={o.id}>
            <Link
              to="/shop/orders/$orderId"
              params={{ orderId: o.id }}
              className="block rounded-2xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex justify-between gap-2">
                <p className="font-bold">{o.order_number}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">
                  {o.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-teal-800">{formatNgn(Number(o.total))}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
            </Link>
          </li>
        ))}
      </ul>
    </MarketplaceShell>
  );
}
