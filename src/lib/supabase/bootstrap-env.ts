import {
  readSupabasePublicEnv,
  supabasePublicEnvSchema,
  type SupabasePublicEnv,
} from "@/lib/supabase/runtime-env";

let cached: SupabasePublicEnv | null = readSupabasePublicEnv();
let inflight: Promise<SupabasePublicEnv | null> | null = null;

/** Browser: fall back to /api/public-config when Vite did not embed VITE_* (common after Vercel env changes). */
export async function ensureSupabasePublicEnv(): Promise<SupabasePublicEnv | null> {
  if (cached) return cached;

  const embedded = readSupabasePublicEnv();
  if (embedded) {
    cached = embedded;
    return cached;
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (!inflight) {
    inflight = fetch("/api/public-config", { credentials: "same-origin" })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((body) => {
        const parsed = supabasePublicEnvSchema.safeParse(body);
        if (parsed.success) {
          cached = parsed.data;
          return cached;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

export function getCachedSupabasePublicEnv(): SupabasePublicEnv | null {
  return cached ?? readSupabasePublicEnv();
}
