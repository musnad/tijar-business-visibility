"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { fetchBusinessEnquiries, replyToEnquiry } from "@/services/discover-service";

export function SellerInboxScreen({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["seller-enquiries", businessId],
    queryFn: async () => {
      const r = await fetchBusinessEnquiries(businessId);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  return (
    <>
      <AppPageHeader title="Customer enquiries" subtitle="Messages sent to this shop. You cannot see another business's inbox." />
      {query.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {(query.data?.length ?? 0) === 0 && !query.isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">No enquiries yet.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(query.data ?? []).map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
            <p className="mt-1 font-bold">{row.customer_name}</p>
            {row.customer_phone && <p className="text-xs">{row.customer_phone}</p>}
            <p className="mt-2 text-sm">{row.message}</p>
            {row.seller_reply ? (
              <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">Reply: {row.seller_reply}</p>
            ) : (
              <EnquiryReply
                onSend={async (text) => {
                  const r = await replyToEnquiry(row.id, businessId, text);
                  if (r.error) {
                    toast.error(r.error);
                    return;
                  }
                  toast.success("Reply saved");
                  await queryClient.invalidateQueries({ queryKey: ["seller-enquiries", businessId] });
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function EnquiryReply({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: () => onSend(text),
    onSuccess: () => setText(""),
  });
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        send.mutate();
      }}
    >
      <input
        className="min-h-10 flex-1 rounded-xl border px-3 text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply to this customer"
      />
      <Button size="sm" className="rounded-xl" disabled={send.isPending}>
        Send
      </Button>
    </form>
  );
}
