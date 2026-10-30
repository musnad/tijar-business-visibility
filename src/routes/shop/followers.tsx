import { createFileRoute } from "@tanstack/react-router";

import { FollowersScreen } from "@/features/marketplace/follows-screen";

export const Route = createFileRoute("/shop/followers")({
  component: () => <FollowersScreen />,
});
