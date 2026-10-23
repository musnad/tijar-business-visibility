import { createFileRoute } from "@tanstack/react-router";

import { nkenneKeyFingerprint, readNkenneConfig } from "@/lib/nkenne/client";
import {
  fetchBusinessCategoriesServer,
  isSupabaseEnvPresent,
  pingSupabaseServer,
} from "@/lib/supabase/server-health";
import { supabaseEnvDiagnostics } from "@/lib/supabase/runtime-env";
import { getConfiguredSiteOrigin } from "@/lib/site-url";

export const Route = createFileRoute("/api/supabase-health")({
  server: {
    handlers: {
      GET: async () => {
        const authPing = await pingSupabaseServer();
        const categories = await fetchBusinessCategoriesServer();
        // Presence / length / masked hint only — never the full secret.
        const nkenne = readNkenneConfig();
        const finger = nkenneKeyFingerprint(nkenne.apiKey);

        return Response.json({
          env: {
            supabaseConfigured: isSupabaseEnvPresent(),
            publicAppUrl: getConfiguredSiteOrigin() || null,
            appEnv: import.meta.env.VITE_APP_ENV ?? "development",
            keysPresent: {
              ...supabaseEnvDiagnostics(),
              NKENNEAI_API_KEY: finger.present,
              NKENNEAI_API_KEY_FORMAT_OK: finger.formatOk,
              NKENNEAI_API_KEY_LENGTH: finger.length,
              NKENNEAI_API_KEY_HINT: finger.hint,
            },
          },
          auth: authPing,
          database: categories.error
            ? {
                ok: false,
                message: categories.error.message,
                hint: "Run supabase/migrations/20260307000000_phase0_foundation.sql in the SQL editor, then seed_business_categories.sql.",
              }
            : {
                ok: true,
                categories: categories.data?.length ?? 0,
              },
        });
      },
    },
  },
});
