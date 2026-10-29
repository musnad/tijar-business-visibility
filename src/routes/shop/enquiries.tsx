import { createFileRoute } from "@tanstack/react-router";

import { EnquiriesScreen } from "@/features/marketplace/enquiries-screen";

export const Route = createFileRoute("/shop/enquiries")({
  component: EnquiriesScreen,
});
