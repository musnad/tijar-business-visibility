"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";
import { fetchMyEnquiries } from "@/services/marketplace-service";

export function EnquiriesScreen() {
  const { profile, session } = useAuth();
  const query = useQuery({
    queryKey: ["my-enquiries", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const r = await fetchMyEnquiries(profile!.id);
      if (r.error) throw new Error(r.error);
      return r.enquiries;
    },
  });

  if (!session) {
    return (
      <MarketplaceShell>
        <p className="text-sm">
          <Link to="/login" className="font-bold text-primary">
            Sign in
          </Link>{" "}
          to see enquiry history.
        </p>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell>
      <h1 className="text-xl font-extrabold">Enquiry history</h1>
      <p className="mt-1 text-sm text-muted-foreground">Messages you sent to shops. This is not a paid order.</p>
      {query.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {!query.isLoading && (query.data?.length ?? 0) === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No enquiries yet.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(query.data ?? []).map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
            <p className="mt-2 text-sm">{row.message}</p>
          </li>
        ))}
      </ul>
    </MarketplaceShell>
  );
}
