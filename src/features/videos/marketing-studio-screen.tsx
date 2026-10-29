"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { listProducts } from "@/services/product-service";

export function MarketingStudioScreen({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [picked, setPicked] = useState<string>("");
  const [draft, setDraft] = useState("");
  const productsQuery = useQuery({
    queryKey: ["studio-products", businessId],
    queryFn: async () => {
      const r = await listProducts(businessId);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  const product = (productsQuery.data ?? []).find((p) => p.id === picked);

  function makeCaption() {
    if (!product) {
      toast.error("Pick a real catalogue item.");
      return;
    }
    const desc = (product.description || product.notes || "").trim();
    const price = product.sale_price != null ? `Price from the listing.` : "Ask in-app for price.";
    const text = `${product.name} at ${businessName}. ${desc ? `${desc.slice(0, 140)} ` : ""}${price}`.trim();
    setDraft(text);
  }

  return (
    <>
      <AppPageHeader
        title="AI Marketing Studio"
        subtitle="Video generation is not connected. Captions here are drafted only from your public catalogue fields."
      />
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        No AI video library exists yet. Choose a product, draft a caption from its name and description, then attach a video you filmed.
      </p>
      <select
        className="mt-4 h-11 w-full rounded-xl border px-3 text-sm"
        value={picked}
        onChange={(e) => setPicked(e.target.value)}
      >
        <option value="">Select a product you own</option>
        {(productsQuery.data ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button className="mt-3 rounded-xl" type="button" onClick={makeCaption}>
        Draft caption from listing
      </Button>
      {draft && (
        <textarea className="mt-3 min-h-28 w-full rounded-xl border px-3 py-2 text-sm" value={draft} readOnly />
      )}
      <Button className="mt-4 rounded-xl" asChild>
        <Link to="/app/videos/new">Continue to video publish</Link>
      </Button>
    </>
  );
}
