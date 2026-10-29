"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { fetchSellerVideos } from "@/services/seller-dashboard-service";
import { retryVideoJob, videoPublicStatus } from "@/services/video-studio-service";
import { resolveCoverSrc } from "@/services/video-feed-service";

export function SellerVideosScreen({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["seller-videos", businessId],
    queryFn: async () => {
      const r = await fetchSellerVideos(businessId);
      if (r.error) throw new Error(r.error);
      return r.videos;
    },
  });

  return (
    <>
      <AppPageHeader
        title="Shopping videos"
        subtitle="Draft, processing, pending moderation, published, rejected, or failed — from this shop only."
        action={
          <Button className="rounded-xl font-bold" asChild>
            <Link to="/app/videos/new">New video</Link>
          </Button>
        }
      />
      {query.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {query.isError && <p className="mt-6 text-sm text-destructive">Could not load videos for this business.</p>}
      {(query.data?.length ?? 0) === 0 && !query.isLoading && (
        <p className="mt-6 text-sm text-muted-foreground">No videos yet. Publish from a catalogue item.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(query.data ?? []).map((v) => (
          <li key={v.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="size-16 overflow-hidden rounded-xl bg-muted">
              {v.cover_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveCoverSrc(v.cover_path) ?? ""} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{v.caption || "Untitled"}</p>
              <p className="text-xs font-semibold text-primary">{videoPublicStatus(v)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {v.view_count} qualified views · {v.like_count} likes · {v.save_count} saves
              </p>
              {v.processing_error && <p className="mt-1 text-xs text-destructive">{v.processing_error}</p>}
              {v.rejection_reason && <p className="mt-1 text-xs text-destructive">Correction: {v.rejection_reason}</p>}
              {(v.status === "failed" || v.status === "processing") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 rounded-lg"
                  onClick={async () => {
                    const r = await retryVideoJob(v.id, businessId);
                    if (r.error) toast.error(r.error);
                    else {
                      toast.success("Prepare job retried");
                      await queryClient.invalidateQueries({ queryKey: ["seller-videos", businessId] });
                    }
                  }}
                >
                  Retry processing
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
