"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchListingsForModeration,
  fetchMyPlatformRoles,
  setListingModeration,
} from "@/services/discover-service";
import { detectDuplicates, isListingVisible, listingCompleteness } from "@/utils/discover";

export function ModerationScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ["platform-roles", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchMyPlatformRoles(profile!.id),
  });
  const isAdmin = (rolesQuery.data ?? []).includes("admin");

  const listingsQuery = useQuery({
    queryKey: ["moderation-listings"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchListingsForModeration();
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  const duplicates = useMemo(
    () => detectDuplicates(listingsQuery.data ?? []),
    [listingsQuery.data],
  );

  async function setStatus(id: string, status: "approved" | "flagged" | "suspended" | "pending") {
    const { error } = await setListingModeration(id, status);
    if (error) toast.error(error);
    else {
      toast.success(`Listing ${status}.`);
      void queryClient.invalidateQueries({ queryKey: ["moderation-listings"] });
    }
  }

  if (rolesQuery.isLoading) return <p className="mt-8 text-muted-foreground">Checking access…</p>;
  if (!isAdmin) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 font-bold">Admins only</p>
        <p className="text-sm text-muted-foreground">Your account does not have the TIJAR admin role.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {listingsQuery.isLoading && <p className="text-muted-foreground">Loading listings…</p>}
      {(listingsQuery.data ?? []).map((b) => {
        const completeness = listingCompleteness({
          business_name: b.business_name, description: b.description, public_slug: b.public_slug,
          latitude: b.latitude, longitude: b.longitude, location_approved: b.location_approved,
          public_phone: b.public_phone, public_whatsapp: b.public_whatsapp, logo_url: b.logo_url,
        });
        const dupes = duplicates.get(b.id) ?? [];
        return (
          <article key={b.id} className="rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">{b.business_name}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{b.moderation_status}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{b.is_published ? "published" : "unpublished"}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{isListingVisible(b) ? "visible" : "hidden"}</span>
              <span className="text-xs text-muted-foreground">{completeness.score}% complete</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              /b/{b.public_slug ?? "—"} · {b.public_location_label ?? b.location ?? "no area"} · {b.verification_status}
            </p>
            {completeness.missing.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">Incomplete: {completeness.missing.join(", ")}</p>
            )}
            {dupes.length > 0 && (
              <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" /> Possible duplicate: {dupes.join("; ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="rounded-xl" onClick={() => setStatus(b.id, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setStatus(b.id, "flagged")}>Flag</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setStatus(b.id, "suspended")}>Suspend</Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setStatus(b.id, "pending")}>Back to pending</Button>
            </div>
          </article>
        );
      })}
      {listingsQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No businesses found.</p>}
    </div>
  );
}
