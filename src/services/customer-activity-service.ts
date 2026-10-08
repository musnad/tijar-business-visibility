import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TransactionListItem } from "@/types/database";

export async function listCustomerCreditActivity(
  businessId: string,
  limit = 10,
): Promise<{ data: TransactionListItem[]; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, customers(name), suppliers(name)")
    .eq("business_id", businessId)
    .or("and(type.eq.sale,payment_method.eq.credit),type.eq.customer_payment")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TransactionListItem[], error: null };
}
