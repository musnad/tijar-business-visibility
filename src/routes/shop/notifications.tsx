import { createFileRoute } from "@tanstack/react-router";

import { NotificationPrefsScreen } from "@/features/marketplace/notification-prefs-screen";

export const Route = createFileRoute("/shop/notifications")({
  component: NotificationPrefsScreen,
});
