import type { CustomerFormInput } from "@/features/transactions/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Customer } from "@/types/database";

export async function listCustomers(businessId: string): Promise<{
  data: Customer[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("name");

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Customer[], error: null };
}

export async function createCustomer(
  businessId: string,
  input: CustomerFormInput,
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return { customer: null, error: error.message };
  return { customer: data as Customer, error: null };
}

export async function deleteCustomer(customerId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  return { error: error?.message ?? null };
}
