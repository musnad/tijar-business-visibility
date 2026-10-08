import { createFileRoute } from "@tanstack/react-router";

import { fetchBusinessCategories, pingSupabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/api/supabase-health")({
  server: {
    handlers: {
      GET: async () => {
        const authPing = await pingSupabase();
        const categories = await fetchBusinessCategories();

        return Response.json({
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
