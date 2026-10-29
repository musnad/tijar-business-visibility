import { createFileRoute } from "@tanstack/react-router";

import { VideoFeedScreen } from "@/features/marketplace/video-feed-screen";

type ShopSearch = { v?: string };

export const Route = createFileRoute("/shop/")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    if (typeof search.v === "string" && search.v.length > 0) return { v: search.v };
    return {};
  },
  component: ForYouPage,
});

function ForYouPage() {
  const { v } = Route.useSearch();
  return <VideoFeedScreen initialVideoId={v} />;
}
