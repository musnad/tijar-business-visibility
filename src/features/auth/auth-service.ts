import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  categoryId?: string;
  location?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
        phone: input.phone?.trim(),
        signup_category_id: input.categoryId,
        signup_location: input.location?.trim(),
      },
    },
  });
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const supabase = getSupabaseBrowserClient();
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/app/login` : undefined;
  return supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
}

export async function changePasswordWithVerification(input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.currentPassword,
  });
  if (verifyError) {
    return { error: verifyError.message };
  }
  const { error } = await supabase.auth.updateUser({ password: input.newPassword });
  return { error: error?.message ?? null };
}

export async function signOutAllDevices() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signOut({ scope: "global" });
}

export async function deleteOwnAccount(): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    if (error.message.includes("Could not find the function")) {
      return {
        error: "Account deletion is not enabled on the server yet. Apply migration 20260307000008.",
      };
    }
    return { error: error.message };
  }
  await supabase.auth.signOut();
  return { error: null };
}

export function userHasPasswordLogin(user: { identities?: { provider: string }[] } | null): boolean {
  if (!user?.identities?.length) return true;
  return user.identities.some((i) => i.provider === "email");
}
