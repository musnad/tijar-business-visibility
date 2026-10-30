import { createFileRoute } from "@tanstack/react-router";

import { getPaymentAdapterStatus } from "@/lib/payments/adapter";

export const Route = createFileRoute("/api/payments/status")({
  server: {
    handlers: {
      GET: async () => {
        const status = getPaymentAdapterStatus();
        return Response.json({
          ready: status.ready,
          provider: status.provider,
          checkoutMode: status.checkoutMode,
        });
      },
    },
  },
});
