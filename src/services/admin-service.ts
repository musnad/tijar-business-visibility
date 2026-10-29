import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Business,
  MarketplaceOrder,
  Profile,
  Transaction,
} from "@/types/database";
import type { BusinessUpgradeRequest } from "@/services/marketplace-service";

export type AdminTransaction = Transaction & {
  businesses?: { business_name: string } | null;
};

export type AdminOrder = MarketplaceOrder & {
  businesses?: { business_name: string } | null;
  buyer?: { full_name: string; email: string | null } | null;
};

export type AdminPayment = {
  id: string;
  order_id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
};

export type KycStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected"
  | "requires_update";

export async function fetchAdminUpgradeRequests(): Promise<{
  requests: BusinessUpgradeRequest[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("business_upgrade_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
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
    .limit(500);
  if (error) return { profiles: [], error: error.message };
  return { profiles: (data ?? []) as Profile[], error: null };
}

export async function fetchAdminBusinesses(): Promise<{
  businesses: Business[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) return { businesses: [], error: error.message };
  return { businesses: (data ?? []) as Business[], error: null };
}

export async function fetchAdminOrders(): Promise<{
  orders: AdminOrder[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, businesses(business_name), buyer:profiles!orders_buyer_profile_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) {
    const fallback = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(400);
    if (fallback.error) return { orders: [], error: fallback.error.message };
    return { orders: (fallback.data ?? []) as AdminOrder[], error: null };
  }
  return { orders: (data ?? []) as AdminOrder[], error: null };
}

export async function fetchAdminTransactions(): Promise<{
  transactions: AdminTransaction[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, businesses(business_name)")
    .order("occurred_at", { ascending: false })
    .limit(800);
  if (error) {
    const fallback = await supabase
      .from("transactions")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(800);
    if (fallback.error) return { transactions: [], error: fallback.error.message };
    return { transactions: (fallback.data ?? []) as AdminTransaction[], error: null };
  }
  return { transactions: (data ?? []) as AdminTransaction[], error: null };
}

export async function fetchAdminPayments(): Promise<{
  payments: AdminPayment[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, order_id, provider, status, amount, currency, created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) return { payments: [], error: error.message };
  return { payments: (data ?? []) as AdminPayment[], error: null };
}

export async function setBusinessVerification(
  businessId: string,
  status: KycStatus,
  notes?: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const patch: Record<string, unknown> = {
    verification_status: status,
  };
  if (notes?.trim()) patch.moderation_notes = notes.trim();
  if (status === "verified") {
    patch.moderation_status = "approved";
    patch.location_approved = true;
  }
  const { error } = await supabase.from("businesses").update(patch).eq("id", businessId);
  return { error: error?.message ?? null };
}

export async function setBusinessPublished(
  businessId: string,
  published: boolean,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
    })
    .eq("id", businessId);
  return { error: error?.message ?? null };
}

export function shopName(row: { businesses?: { business_name: string } | null; business_id?: string }): string {
  return row.businesses?.business_name ?? row.business_id?.slice(0, 8) ?? "Shop";
}
