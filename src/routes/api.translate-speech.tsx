import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/translate-speech — voice structure only.
 *
 * The documented NKENNEAi quickstart (2026-10-21) covers text-to-text only;
 * no speech-to-text / text-to-speech endpoint, audio format, or language
 * values are documented. Per integration rules we do not invent endpoints,
 * so this route validates size/type and reports voice as unavailable until
 * official speech documentation + credentials are provided.
 */
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"];

export const Route = createFileRoute("/api/translate-speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("multipart/form-data")) {
          const form = await request.formData().catch(() => null);
          const file = form?.get("audio");
          if (file instanceof File) {
            if (file.size > MAX_AUDIO_BYTES) {
              return Response.json(
                { error: { code: "AUDIO_TOO_LARGE", message: "Recording is too large (max 5 MB / about 60 seconds)." } },
                { status: 400 },
              );
            }
            if (file.type && !ALLOWED_TYPES.includes(file.type)) {
              return Response.json(
                { error: { code: "AUDIO_UNSUPPORTED", message: `Audio type ${file.type} is not supported.` } },
                { status: 400 },
              );
            }
          }
        }
        return Response.json(
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
