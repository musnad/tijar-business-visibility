import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export async function fetchCurrentProfile(): Promise<{
  profile: Profile | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { profile: null, error: authError?.message ?? null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data as Profile | null, error: null };
}

export async function updateProfile(
  profileId: string,
  patch: Partial<
    Pick<
      Profile,
      | "full_name"
      | "phone"
      | "preferred_language"
      | "onboarding_status"
      | "avatar_url"
      | "bio"
      | "preferred_tts_voice"
      | "voice_sample_path"
      | "custom_voice_id"
      | "voice_enrolled_at"
    >
  >,
) {
  const supabase = getSupabaseBrowserClient();
  return supabase.from("profiles").update(patch).eq("id", profileId).select().single();
}
