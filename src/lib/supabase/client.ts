import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/config/env";
import type { SupabasePublicEnv } from "@/lib/supabase/runtime-env";
import { getCachedSupabasePublicEnv } from "@/lib/supabase/bootstrap-env";

let browserClient: SupabaseClient | undefined;

export function primeSupabaseBrowserClient(env: SupabasePublicEnv): SupabaseClient {
  browserClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

/** Singleton Supabase client for browser / client components. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const cached = getCachedSupabasePublicEnv();
    if (cached) {
      return primeSupabaseBrowserClient(cached);
    }
    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = getSupabaseEnv();
    browserClient = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

/** Quick connectivity check (does not require migrations). */
export async function pingSupabase(): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.getSession();
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Connected to Supabase Auth." };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, message };
  }
}

/** After Phase 0 migration is applied, verify public categories are readable. */
export async function fetchBusinessCategories() {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .from("business_categories")
    .select("id, name, slug, sort_order")
    .eq("active", true)
    .order("sort_order");
}
