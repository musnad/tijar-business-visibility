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
      {detailQuery.isLoading && <p>Loading…</p>}
      {order && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Order</p>
            <h1 className="text-xl font-extrabold">{order.order_number}</h1>
            <p className="mt-1 text-sm capitalize">{order.status.replace(/_/g, " ")}</p>
            <p className="mt-2 text-lg font-extrabold text-teal-800">{formatNgn(Number(order.total))}</p>
            <p className="text-xs text-muted-foreground">Fulfilment: {order.fulfilment.replace(/_/g, " ")}</p>
          </div>
          <ul className="rounded-2xl border border-border bg-white divide-y">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  {i.product_name} × {i.quantity}
                </span>
                <span className="font-semibold">{formatNgn(Number(i.line_total))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MarketplaceShell>
  );
}
