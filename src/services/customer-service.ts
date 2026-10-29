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
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error && /email/i.test(error.message)) {
    const retry = await supabase
      .from("customers")
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        notes: [input.email?.trim(), input.notes?.trim()].filter(Boolean).join(" · ") || null,
      })
      .select("*")
      .single();
    if (retry.error) return { customer: null, error: retry.error.message };
    return { customer: retry.data as Customer, error: null };
  }
  if (error) return { customer: null, error: error.message };
  return { customer: data as Customer, error: null };
}

export async function importCustomers(
  businessId: string,
  rows: { name: string; email: string | null; phone: string | null }[],
): Promise<{ imported: number; error: string | null }> {
  let imported = 0;
  let lastError: string | null = null;
  for (const row of rows) {
    const r = await createCustomer(businessId, {
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      notes: "Imported from file",
    });
    if (r.customer) imported += 1;
    else lastError = r.error;
  }
  return { imported, error: imported === 0 ? lastError : null };
}

export async function enrollInService(input: {
  productId: string;
  fullName: string;
  email?: string;
  phone?: string;
}): Promise<{ id?: string; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("enroll_in_service", {
    p_product_id: input.productId,
    p_full_name: input.fullName.trim(),
    p_email: input.email?.trim() || null,
    p_phone: input.phone?.trim() || null,
  });
  if (error) return { error: error.message };
  return { id: data as string, error: null };
}

export async function listServiceEnrollments(businessId: string): Promise<{
  data: import("@/types/database").ServiceEnrollment[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("service_enrollments")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as import("@/types/database").ServiceEnrollment[], error: null };
}

export async function deleteCustomer(customerId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  return { error: error?.message ?? null };
}
