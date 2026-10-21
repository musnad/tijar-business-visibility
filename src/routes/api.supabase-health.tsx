import { createFileRoute } from "@tanstack/react-router";

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

        return Response.json({
          env: {
            supabaseConfigured: isSupabaseEnvPresent(),
            publicAppUrl: getConfiguredSiteOrigin() || null,
            appEnv: import.meta.env.VITE_APP_ENV ?? "development",
            keysPresent: supabaseEnvDiagnostics(),
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
