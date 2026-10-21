import { createFileRoute } from "@tanstack/react-router";

import { readEnvString, readSupabasePublicEnv } from "@/lib/supabase/runtime-env";

export const Route = createFileRoute("/api/public-config")({
  server: {
    handlers: {
      GET: async () => {
        const env = readSupabasePublicEnv();
        if (!env) {
          return Response.json(
            { error: "Supabase is not configured on this server." },
            { status: 503 },
          );
        }
        const publicAppUrl = readEnvString("VITE_PUBLIC_APP_URL");
        return Response.json({
          ...env,
          VITE_PUBLIC_APP_URL: publicAppUrl ?? "",
        });
      },
    },
  },
});
