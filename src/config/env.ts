import {
  readSupabasePublicEnv,
  type SupabasePublicEnv,
} from "@/lib/supabase/runtime-env";

export type AppEnv = SupabasePublicEnv;

function readEnv(): AppEnv {
  const env = readSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local or your host.",
    );
  }
  return env;
}

/** Browser-safe Supabase config (anon/publishable key only). */
export function getSupabaseEnv(): AppEnv {
  return readEnv();
}

export function isSupabaseConfigured(): boolean {
  return readSupabasePublicEnv() !== null;
}
