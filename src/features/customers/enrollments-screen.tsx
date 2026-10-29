"use client";

import { useQuery } from "@tanstack/react-query";

import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { listServiceEnrollments } from "@/services/customer-service";

export function EnrollmentsScreen({ businessId }: { businessId: string }) {
  const query = useQuery({
    queryKey: ["service-enrollments", businessId],
    queryFn: async () => {
      const r = await listServiceEnrollments(businessId);
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  return (
    <div className="pb-8">
      <AppPageHeader
        title="Course & mentorship sign-ups"
        subtitle="People who enrolled with name, email or phone."
        action={<BackLinkButton to="/app/customers" label="Back" />}
      />
      {query.isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {query.isError && (
        <p className="mt-6 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load enrollments. Run the latest SQL migration."}
        </p>
      )}
      {query.data && query.data.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          No enrollments yet. When someone signs up for a course or mentorship, they appear here and in Customers.
        </p>
      )}
      {query.data && query.data.length > 0 && (
        <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          {query.data.map((row) => (
            <li key={row.id} className="border-b border-border px-3 py-3 last:border-b-0">
              <p className="text-sm font-bold">{row.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {[row.email, row.phone].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 text-[11px] font-semibold capitalize text-primary">{row.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
