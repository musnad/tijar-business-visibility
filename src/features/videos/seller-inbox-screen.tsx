"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { useAuth } from "@/features/auth/auth-context";
import { fetchShopInbox } from "@/services/shop-chat-service";
import { fetchBusinessEnquiries } from "@/services/discover-service";

export function SellerInboxScreen({ businessId }: { businessId: string }) {
  const { profile } = useAuth();
  const chats = useQuery({
    queryKey: ["seller-shop-chats", businessId, profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const r = await fetchShopInbox(profile!.id, [businessId]);
      if (r.error) throw new Error(r.error);
      return r.rows.filter((row) => row.business_id === businessId);
    },
  });
  const enquiries = useQuery({
    queryKey: ["seller-enquiries", businessId],
    queryFn: async () => {
      const r = await fetchBusinessEnquiries(businessId);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  return (
    <>
      <AppPageHeader title="Inbox" subtitle="Chats from shoppers. Reply in Messages." />
      {chats.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {(chats.data?.length ?? 0) === 0 && !chats.isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">No shop chats yet. Customers message you from a product or your storefront.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(chats.data ?? []).map((row) => (
          <li key={row.id}>
            <Link
              to="/shop/enquiries/$conversationId"
              params={{ conversationId: row.id }}
              className="block rounded-2xl border border-border bg-card p-4"
            >
              <p className="font-bold">{row.customer_name}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{row.last_preview || "Open chat"}</p>
            </Link>
          </li>
        ))}
      </ul>
      {(enquiries.data?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-extrabold">Older enquiries</h2>
          <ul className="mt-3 space-y-3">
            {enquiries.data?.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                <p className="mt-1 font-bold">{row.customer_name}</p>
                <p className="mt-2 text-sm">{row.message}</p>
                {row.seller_reply ? <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">Reply: {row.seller_reply}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
