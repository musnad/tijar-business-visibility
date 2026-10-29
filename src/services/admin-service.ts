import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Business, MarketplaceOrder, Profile } from "@/types/database";
import type { BusinessUpgradeRequest } from "@/services/marketplace-service";

export async function fetchAdminUpgradeRequests(): Promise<{
  requests: BusinessUpgradeRequest[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("business_upgrade_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { requests: [], error: error.message };
  return { requests: (data ?? []) as BusinessUpgradeRequest[], error: null };
}

export async function reviewBusinessUpgrade(
  requestId: string,
  approve: boolean,
  notes?: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("review_business_upgrade", {
    p_request_id: requestId,
    p_approve: approve,
    p_notes: notes?.trim() || null,
  });
  return { error: error?.message ?? null };
}

export async function fetchAdminProfiles(): Promise<{
  profiles: Profile[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return { profiles: [], error: error.message };
  return { profiles: (data ?? []) as Profile[], error: null };
}

export async function fetchAdminOrders(): Promise<{
  orders: MarketplaceOrder[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { orders: [], error: error.message };
  return { orders: (data ?? []) as MarketplaceOrder[], error: null };
}

export async function setBusinessVerification(
  businessId: string,
  status: "verified" | "rejected" | "under_review",
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("businesses")
    .update({ verification_status: status })
    .eq("id", businessId);
  return { error: error?.message ?? null };
}

export function summarizeAdmin(
  profiles: Profile[],
  businesses: Business[],
  requests: BusinessUpgradeRequest[],
  orders: MarketplaceOrder[],
) {
  return {
    users: profiles.length,
    shops: businesses.length,
    pendingListings: businesses.filter((b) => b.moderation_status === "pending").length,
    pendingUpgrades: requests.filter((r) => r.status === "pending").length,
    orders: orders.length,
    verified: businesses.filter((b) => b.verification_status === "verified").length,
  };
}
