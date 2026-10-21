import { createFileRoute } from "@tanstack/react-router";

import { translateText } from "@/lib/nkenne/service";

/**
 * POST /api/translate  { text, fromLanguage, toLanguage }
 * Server-only NKENNEAi proxy. The API key never reaches the client.
 * Rate-limited per user (Supabase JWT sub) or per IP for anonymous
 * marketplace visitors. Request/response text is never logged.
 */
export const Route = createFileRoute("/api/translate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: { code: "VALIDATION", message: "Invalid JSON body." } },
            { status: 400 },
          );
        }

        const rateLimitKey = await resolveRateLimitKey(request);
        const result = await translateText(body, { rateLimitKey });

        if (!result.ok) {
          return Response.json(
            { error: { code: result.code, message: result.message } },
            { status: result.status },
          );
        }
        return Response.json({
          translatedText: result.translatedText,
          fromLanguage: result.fromLanguage,
          toLanguage: result.toLanguage,
          cached: result.cached,
        });
      },
    },
  },
});

/** Prefer the Supabase user id when a session token is sent; else IP. */
async function resolveRateLimitKey(request: Request): Promise<string> {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const payloadPart = auth.slice(7).split(".")[1];
      if (payloadPart) {
        const payload = JSON.parse(
          Buffer.from(payloadPart.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
        ) as { sub?: string };
        if (payload.sub) return `user:${payload.sub}`;
      }
    } catch {
      // fall through to IP key
    }
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}
