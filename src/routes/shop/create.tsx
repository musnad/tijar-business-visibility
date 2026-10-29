import { createFileRoute } from "@tanstack/react-router";

import { VideoCreateScreen } from "@/features/marketplace/video-create-screen";

export const Route = createFileRoute("/shop/create")({
  component: VideoCreateScreen,
});
