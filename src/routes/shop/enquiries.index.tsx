import { createFileRoute } from "@tanstack/react-router";

import { EnquiriesScreen } from "@/features/marketplace/messages-screen";

export const Route = createFileRoute("/shop/enquiries/")({
  component: EnquiriesScreen,
});
