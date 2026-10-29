"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { canSellerTransition } from "@/lib/checkout/order-status";
import { fetchSellerOrders } from "@/services/seller-dashboard-service";
import { transitionOrder } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";
import { orderStatusLabel } from "@/utils/order-tracking";

export function SellerOrdersInboxScreen({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["seller-orders", businessId],
    queryFn: async () => {
      const r = await fetchSellerOrders(businessId);
      if (r.error) throw new Error(r.error);
      return r.orders;
    },
  });

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => transitionOrder(id, status),
    onSuccess: async (r) => {
      if (r.error) toast.error(r.error);
      else {
        toast.success("Status updated");
        await queryClient.invalidateQueries({ queryKey: ["seller-orders", businessId] });
      }
    },
  });

  return (
    <>
      <AppPageHeader
        title="Marketplace orders"
        subtitle="Requests and confirmed orders for this shop only. Paid is never set from this screen."
      />
      {query.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {(query.data?.length ?? 0) === 0 && !query.isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">No order requests yet.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(query.data ?? []).map((o) => {
          const next =
            o.status === "pending_payment"
              ? "confirmed"
              : o.status === "confirmed"
                ? "processing"
                : o.status === "processing"
                  ? "ready_for_pickup"
                  : null;
          return (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{orderStatusLabel(o.status)}</p>
                </div>
                <p className="font-extrabold text-primary">{formatNgn(Number(o.total))}</p>
              </div>
              {next && canSellerTransition(o.status, next) && (
                <Button
                  size="sm"
                  className="mt-3 rounded-xl"
                  disabled={move.isPending}
                  onClick={() => move.mutate({ id: o.id, status: next })}
                >
                  Mark {orderStatusLabel(next)}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
