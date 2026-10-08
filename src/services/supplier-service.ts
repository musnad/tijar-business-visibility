import type { SupplierFormInput } from "@/features/transactions/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Supplier } from "@/types/database";

export async function listSuppliers(businessId: string): Promise<{
  data: Supplier[];
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("business_id", businessId)
    .order("name");

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Supplier[], error: null };
}

export async function createSupplier(
  businessId: string,
  input: SupplierFormInput,
): Promise<{ supplier: Supplier | null; error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      business_id: businessId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return { supplier: null, error: error.message };
  return { supplier: data as Supplier, error: null };
}

export async function deleteSupplier(supplierId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", supplierId);
  return { error: error?.message ?? null };
}
