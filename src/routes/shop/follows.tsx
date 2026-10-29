import { createFileRoute } from "@tanstack/react-router";

import { FollowsScreen } from "@/features/marketplace/follows-screen";

export const Route = createFileRoute("/shop/follows")({
  component: FollowsScreen,
});
