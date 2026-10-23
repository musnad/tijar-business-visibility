import { createFileRoute } from "@tanstack/react-router";

import {
  assertTranslateOrigin,
  clientIp,
  jsonSecure,
} from "@/lib/nkenne/api-security";
import { checkRateLimit } from "@/lib/nkenne/rate-limit";

/**
 * POST /api/translate-speech — voice structure only.
 *
 * Documented NKENNEAi covers text-to-text only; this route validates
 * size/type, enforces origin + rate limits, and returns 501 until official
 * speech docs exist. No audio bytes are forwarded or logged.
 */
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"];

export const Route = createFileRoute("/api/translate-speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = assertTranslateOrigin(request);
        if (!origin.ok) {
          return jsonSecure({ error: { code: origin.code, message: origin.message } }, { status: origin.status });
        }

        const limit = checkRateLimit(`speech-ip:${clientIp(request)}`, 10);
        if (!limit.allowed) {
          return jsonSecure(
            {
              error: {
                code: "RATE_LIMITED",
                message: `Too many voice requests. Try again in ${limit.retryAfterSeconds}s.`,
              },
            },
            { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
          );
        }

        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("multipart/form-data")) {
          const form = await request.formData().catch(() => null);
          const file = form?.get("audio");
          if (file instanceof File) {
            if (file.size > MAX_AUDIO_BYTES) {
              return jsonSecure(
                {
                  error: {
                    code: "AUDIO_TOO_LARGE",
                    message: "Recording is too large (max 5 MB / about 60 seconds).",
                  },
                },
                { status: 400 },
              );
            }
            if (file.type && !ALLOWED_TYPES.includes(file.type)) {
              return jsonSecure(
                {
                  error: {
                    code: "AUDIO_UNSUPPORTED",
                    message: `Audio type ${file.type} is not supported.`,
                  },
                },
                { status: 400 },
              );
            }
          }
        }

        return jsonSecure(
          {
            error: {
              code: "VOICE_NOT_AVAILABLE",
              message:
                "Voice translation is not available yet: the documented NKENNEAi API currently covers text translation only. Text translation still works.",
            },
          },
          { status: 501 },
        );
      },
    },
  },
});
