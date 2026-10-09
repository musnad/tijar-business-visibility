import { createClient } from "@supabase/supabase-js";

function readSupabaseUrl(): string | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
}

function readSupabaseAnonKey(): string | undefined {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

export function isSupabaseEnvPresent(): boolean {
  return Boolean(readSupabaseUrl() && readSupabaseAnonKey());
}

/** Server-safe health checks (API route / SSR handlers). */
export async function pingSupabaseServer(): Promise<{ ok: boolean; message: string }> {
  const url = readSupabaseUrl();
  const key = readSupabaseAnonKey();
  if (!url || !key) {
    return {
      ok: false,
      message:
        "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY at build time. Set them in your host’s environment before running bun run build.",
    };
  }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.auth.getSession();
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Connected to Supabase Auth." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function fetchBusinessCategoriesServer() {
  const url = readSupabaseUrl();
  const key = readSupabaseAnonKey();
  if (!url || !key) {
    return {
      data: null,
      error: { message: "Supabase env not configured at build time." },
    };
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  return supabase
    .from("business_categories")
    .select("id, name, slug, sort_order")
    .eq("active", true)
    .order("sort_order");
}
