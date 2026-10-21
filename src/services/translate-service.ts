import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseEnvPresent } from "@/lib/supabase/runtime-env";

export type TranslateUiResult =
  | { ok: true; translatedText: string; cached: boolean }
  | { ok: false; code: string; message: string };

/** Client -> POST /api/translate. Attaches the Supabase session when present. */
export async function translateTextClient(input: {
  text: string;
  fromLanguage: string;
  toLanguage: string;
}): Promise<TranslateUiResult> {
  let token: string | null = null;
  if (isSupabaseEnvPresent()) {
    try {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      token = data.session?.access_token ?? null;
    } catch {
      token = null;
    }
  }

  let res: Response;
  try {
    res = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, code: "NETWORK", message: "Could not reach translation. Check your connection." };
  }

  const body = (await res.json().catch(() => null)) as
    | { translatedText?: string; cached?: boolean; error?: { code: string; message: string } }
    | null;

  if (!res.ok || !body?.translatedText) {
    return {
      ok: false,
      code: body?.error?.code ?? "PROVIDER_ERROR",
      message: body?.error?.message ?? "Translation failed. Please try again.",
    };
  }
  return { ok: true, translatedText: body.translatedText, cached: Boolean(body.cached) };
}
