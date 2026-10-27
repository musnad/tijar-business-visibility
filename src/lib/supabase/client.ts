import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/config/env";
import type { SupabasePublicEnv } from "@/lib/supabase/runtime-env";
import { getCachedSupabasePublicEnv } from "@/lib/supabase/bootstrap-env";

const GLOBAL_KEY = "__tijar_supabase_browser_client__";

type GlobalClientStore = {
  client?: SupabaseClient;
  url?: string;
  keyHint?: string;
};

function globalStore(): GlobalClientStore {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: GlobalClientStore };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = {};
  return g[GLOBAL_KEY];
}

function createBrowserClient(env: SupabasePublicEnv): SupabaseClient {
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // One explicit storage key for the whole app (avoids accidental dual clients
      // from HMR / Strict Mode sharing different keys on the same project).
      storageKey: "tijar-sb-auth",
    },
  });
}

/**
 * Install (or reuse) the one browser Supabase client.
 * Never create a second GoTrueClient under the same storage key — that triggers
 * "Multiple GoTrueClient instances detected" and can break uploads/auth.
 */
export function primeSupabaseBrowserClient(env: SupabasePublicEnv): SupabaseClient {
  const store = globalStore();
  const keyHint = env.VITE_SUPABASE_ANON_KEY.slice(0, 12);
  if (store.client && store.url === env.VITE_SUPABASE_URL && store.keyHint === keyHint) {
    return store.client;
  }
  // Same project already primed (HMR / Strict Mode) — reuse.
  if (store.client && store.url === env.VITE_SUPABASE_URL) {
    return store.client;
  }
  store.client = createBrowserClient(env);
  store.url = env.VITE_SUPABASE_URL;
  store.keyHint = keyHint;
  return store.client;
}

/** Singleton Supabase client for browser / client components. */
export function getSupabaseBrowserClient(): SupabaseClient {
  const store = globalStore();
  if (store.client) return store.client;

  const cached = getCachedSupabasePublicEnv();
  if (cached) {
    return primeSupabaseBrowserClient(cached);
  }
  const env = getSupabaseEnv();
  return primeSupabaseBrowserClient(env);
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
