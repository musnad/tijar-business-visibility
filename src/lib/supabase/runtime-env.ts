import { z } from "zod";

export const supabasePublicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

/** Vite embed at build time, or host `process.env` at runtime (e.g. Vercel serverless). */
export function readEnvString(key: string): string | undefined {
  const fromMeta = import.meta.env[key as keyof ImportMetaEnv];
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    const fromProcess = process.env[key];
    if (typeof fromProcess === "string" && fromProcess.trim()) {
      return fromProcess.trim();
    }
  }
  return undefined;
}

export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const parsed = supabasePublicEnvSchema.safeParse({
    VITE_SUPABASE_URL: readEnvString("VITE_SUPABASE_URL"),
    VITE_SUPABASE_ANON_KEY: readEnvString("VITE_SUPABASE_ANON_KEY"),
    VITE_APP_ENV: readEnvString("VITE_APP_ENV") ?? "development",
  });
  return parsed.success ? parsed.data : null;
}

export function isSupabaseEnvPresent(): boolean {
  return readSupabasePublicEnv() !== null;
}
