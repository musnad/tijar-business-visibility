import { createFileRoute } from "@tanstack/react-router";

import { BusinessApplyScreen } from "@/features/marketplace/business-apply-screen";

export const Route = createFileRoute("/shop/business-apply")({
  head: () => ({
    meta: [
      { title: "Apply for business account — TIJAR" },
      {
        name: "description",
        content: "Submit your informal business details for TIJAR admin approval.",
      },
    ],
  }),
  component: BusinessApplyScreen,
});
