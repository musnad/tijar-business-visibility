import { createFileRoute } from "@tanstack/react-router";

import { translateBatch } from "@/lib/nkenne/service";

/** POST /api/translate-batch { texts[], fromLanguage, toLanguage } — max 20 short strings. */
export const Route = createFileRoute("/api/translate-batch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: { code: "VALIDATION", message: "Invalid JSON body." } }, { status: 400 });
        }
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "unknown";
        const result = await translateBatch(body, { rateLimitKey: `batch-ip:${ip}`, rateLimit: 10 });
        if (!result.ok) {
          return Response.json({ error: { code: result.code, message: result.message } }, { status: result.status });
        }
        return Response.json({ translations: result.translations });
      },
    },
  },
});
