import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

function readEnv(): AppEnv {
  const parsed = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV ?? "development",
  });

  if (!parsed.success) {
    const detail = parsed.error.flatten().fieldErrors;
    throw new Error(
      `Missing Supabase environment variables. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ${JSON.stringify(detail)}`,
    );
  }

  return parsed.data;
}

/** Browser-safe Supabase config (anon/publishable key only). */
export function getSupabaseEnv(): AppEnv {
  return readEnv();
}

export function isSupabaseConfigured(): boolean {
  return envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV ?? "development",
  }).success;
}
