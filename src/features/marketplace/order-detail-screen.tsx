"use client";

import { useQuery } from "@tanstack/react-query";

import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { fetchOrderDetail } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const detailQuery = useQuery({
    queryKey: ["marketplace-order", orderId],
    queryFn: async () => {
      const res = await fetchOrderDetail(orderId);
      if (res.error) throw new Error(res.error);
      return res;
    },
  });

  const order = detailQuery.data?.order;
  const items = detailQuery.data?.items ?? [];

  return (
    <MarketplaceShell>
      {detailQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {order && (
        <div className="space-y-4">
          <div className="dashboard-summary-card rounded-2xl p-4 text-primary-foreground shadow-lg">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Order</p>
            <h1 className="mt-1 text-xl font-extrabold">{order.order_number}</h1>
            <p className="mt-1 text-sm capitalize text-white/85">
              {order.status.replace(/_/g, " ")}
            </p>
            <p className="mt-3 text-2xl font-extrabold">{formatNgn(Number(order.total))}</p>
            <p className="mt-1 text-xs text-white/75">
              Fulfilment: {order.fulfilment.replace(/_/g, " ")}
            </p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  {i.product_name} × {i.quantity}
                </span>
                <span className="font-semibold text-primary">
                  {formatNgn(Number(i.line_total))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MarketplaceShell>
  );
}
