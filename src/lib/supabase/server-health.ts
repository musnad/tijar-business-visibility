import { createClient } from "@supabase/supabase-js";

import { isSupabaseEnvPresent, readSupabasePublicEnv } from "@/lib/supabase/runtime-env";

export { isSupabaseEnvPresent };

/** Server-safe health checks (API route / SSR handlers). */
export async function pingSupabaseServer(): Promise<{ ok: boolean; message: string }> {
  const env = readSupabasePublicEnv();
  if (!env) {
    return {
      ok: false,
      message:
        "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in Vercel → Environment Variables, then redeploy.",
    };
  }
  try {
    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.auth.getSession();
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Connected to Supabase Auth." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function fetchBusinessCategoriesServer() {
  const env = readSupabasePublicEnv();
  if (!env) {
    return {
      data: null,
      error: { message: "Supabase env not configured on server." },
    };
  }
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  return supabase
    .from("business_categories")
    .select("id, name, slug, sort_order")
    .eq("active", true)
    .order("sort_order");
}
