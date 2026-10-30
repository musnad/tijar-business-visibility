import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OnboardingAnswers } from "@/features/onboarding/schemas";
import type { MemberRole } from "@/lib/business/capabilities";
import type { Business, BusinessCategory, BusinessDna } from "@/types/database";

export async function listBusinessCategories(): Promise<{
  data: BusinessCategory[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("business_categories")
    .select("id, name, slug, sort_order")
    .eq("active", true)
    .order("sort_order");

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as BusinessCategory[], error: null };
}

/**
 * Ensure the signed-in owner has a business_members row.
 * Product/stock RLS requires membership; businesses select also allows owner_id,
 * so users could open Add Product but inserts failed with RLS.
 */
export async function ensureOwnerMembership(
  businessId: string,
  profileId: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("business_members").upsert(
    {
      business_id: businessId,
      profile_id: profileId,
      role: "owner",
    },
    { onConflict: "business_id,profile_id", ignoreDuplicates: true },
  );
  if (!error) return { error: null };
  // Unique race / already member — fine.
  const m = error.message.toLowerCase();
  if (m.includes("duplicate") || m.includes("unique") || m.includes("already")) {
    return { error: null };
  }
  return { error: error.message };
}

export async function fetchPrimaryBusiness(profileId: string): Promise<{
  business: Business | null;
  dna: BusinessDna | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const owned = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", profileId)
    .order("created_at", { ascending: true })
    .limit(1);

  let business = (owned.data?.[0] as Business | undefined) ?? null;
  if (!business) {
    const { data: memberships } = await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true })
      .limit(20);
    const first = memberships?.[0];
    if (first?.business_id) {
      const memberBiz = await supabase.from("businesses").select("*").eq("id", first.business_id).maybeSingle();
      business = (memberBiz.data as Business | undefined) ?? null;
    }
  }

  if (owned.error && !business) {
    return { business: null, dna: null, error: owned.error.message };
  }

  if (!business) {
    return { business: null, dna: null, error: null };
  }

  // Best-effort heal so product/stock policies work for owners.
  await ensureOwnerMembership(business.id, profileId);

  const { data: dna, error: dnaError } = await supabase
    .from("business_dna")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  if (dnaError) {
    return { business, dna: null, error: dnaError.message };
  }

  return { business, dna: dna as BusinessDna | null, error: null };
}

export type UpdateBusinessProfileInput = {
  businessName: string;
  location: string;
  description?: string;
  categoryId?: string;
  islamicModeEnabled: boolean;
  logoUrl?: string | null;
  publicPhone?: string | null;
};

export async function updateBusinessProfile(
  businessId: string,
  input: UpdateBusinessProfileInput,
): Promise<{ business: Business | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const patch: Record<string, unknown> = {
    business_name: input.businessName.trim(),
    location: input.location.trim(),
    description: input.description?.trim() || null,
    islamic_mode_enabled: input.islamicModeEnabled,
  };
  if (input.categoryId) {
    patch.category_id = input.categoryId;
  }
  if (input.logoUrl !== undefined) {
    patch.logo_url = input.logoUrl;
  }
  if (input.publicPhone !== undefined) {
    patch.public_phone = input.publicPhone;
  }

  const { data, error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("id", businessId)
    .select("*")
    .single();

  if (error) {
    return { business: null, error: error.message };
  }
  return { business: data as Business, error: null };
}

export async function completeBusinessSetup(
  profileId: string,
  answers: OnboardingAnswers,
): Promise<{ businessId: string | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const islamicMode = answers.islamicMode === "yes";
  const primaryModel = answers.revenueModels[0] ?? "retail";

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      owner_id: profileId,
      business_name: answers.businessName.trim(),
      category_id: answers.categoryId,
      location: answers.location.trim(),
      islamic_mode_enabled: islamicMode,
      operating_mode: primaryModel,
      business_stage: "operating",
    })
    .select("id")
    .single();

  if (businessError || !business) {
    return { businessId: null, error: businessError?.message ?? "Could not create business" };
  }

  const businessId = business.id as string;

  const { error: memberError } = await supabase.from("business_members").insert({
    business_id: businessId,
    profile_id: profileId,
    role: "owner",
  });

  if (memberError) {
    return { businessId: null, error: memberError.message };
  }

  const { error: dnaError } = await supabase.from("business_dna").insert({
    business_id: businessId,
    business_model: primaryModel,
    revenue_models: answers.revenueModels,
    customer_types: answers.customerTypes,
    payment_methods: answers.paymentMethods,
    customer_credit_enabled: answers.customerCredit,
    supplier_credit_enabled: answers.supplierCredit,
    inventory_required: answers.managesInventory,
    has_staff: answers.hasStaff,
    record_keeping_methods: answers.recordKeeping,
    discovery_channels: answers.discoveryChannels,
    goals: answers.goals,
  });

  if (dnaError) {
    return { businessId: null, error: dnaError.message };
  }

  await supabase.from("onboarding_sessions").insert({
    profile_id: profileId,
    business_id: businessId,
    current_step: "completed",
    answers,
    completed_at: new Date().toISOString(),
  });

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_status: "completed" })
    .eq("id", profileId);

  if (profileError) {
    return { businessId, error: profileError.message };
  }

  await supabase.from("business_events").insert({
    business_id: businessId,
    event_type: "ONBOARDING_COMPLETED",
    payload: { islamic_mode: islamicMode },
  });

  return { businessId, error: null };
}

export type BusinessMemberRow = {
  id: string;
  business_id: string;
  profile_id: string;
  role: MemberRole;
  permissions: Record<string, boolean>;
  full_name?: string | null;
  email?: string | null;
};

export async function fetchMyMembership(
  businessId: string,
  profileId: string,
): Promise<{ role: MemberRole | null; permissions: Record<string, boolean> }> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase
    .from("business_members")
    .select("role, permissions")
    .eq("business_id", businessId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) {
    const { data: owned } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", profileId)
      .maybeSingle();
    if (owned) return { role: "owner", permissions: {} };
    return { role: null, permissions: {} };
  }
  return {
    role: data.role as MemberRole,
    permissions: (data.permissions as Record<string, boolean>) ?? {},
  };
}

export async function fetchBusinessMembers(businessId: string): Promise<{
  members: BusinessMemberRow[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("business_members")
    .select("id, business_id, profile_id, role, permissions")
    .eq("business_id", businessId)
    .order("created_at");
  if (error) return { members: [], error: error.message };
  const rows = (data ?? []) as BusinessMemberRow[];
  const ids = rows.map((r) => r.profile_id);
  if (ids.length === 0) return { members: rows, error: null };
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  return {
    members: rows.map((r) => ({
      ...r,
      full_name: (byId.get(r.profile_id)?.full_name as string | null) ?? null,
      email: (byId.get(r.profile_id)?.email as string | null) ?? null,
    })),
    error: null,
  };
}

export async function submitKycForReview(
  businessId: string,
  input: { legalName: string; idType: string; idNumber: string; notes?: string },
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const summary = [
    `Legal name: ${input.legalName.trim()}`,
    `ID: ${input.idType.trim()} ${input.idNumber.trim()}`,
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const { error } = await supabase
    .from("businesses")
    .update({
      verification_status: "submitted",
      moderation_notes: summary.slice(0, 2000),
    })
    .eq("id", businessId);
  return { error: error?.message ?? null };
}

export async function inviteBusinessStaff(
  businessId: string,
  email: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("invite_business_staff", {
    p_business_id: businessId,
    p_email: email.trim(),
    p_permissions: {},
  });
  return { error: error?.message ?? null };
}
