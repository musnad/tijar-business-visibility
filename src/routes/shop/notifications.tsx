import { createFileRoute } from "@tanstack/react-router";

import { ActivityInboxScreen } from "@/features/marketplace/activity-inbox-screen";

export const Route = createFileRoute("/shop/notifications")({
  component: ActivityInboxScreen,
});
