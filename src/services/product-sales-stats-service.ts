import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProductSalesStats } from "@/types/database";

export async function fetchProductSalesStats(businessId: string): Promise<{
  byProductId: Record<string, ProductSalesStats>;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("product_id, amount, line_profit")
    .eq("business_id", businessId)
    .eq("type", "sale")
    .not("product_id", "is", null);

  if (error) return { byProductId: {}, error: error.message };

  const byProductId: Record<string, ProductSalesStats> = {};
  for (const row of data ?? []) {
    const id = row.product_id as string;
    if (!id) continue;
    const cur = byProductId[id] ?? {
      productId: id,
      saleCount: 0,
      revenue: 0,
      profit: 0,
    };
    cur.saleCount += 1;
    cur.revenue += Number(row.amount);
    cur.profit += row.line_profit != null ? Number(row.line_profit) : 0;
    byProductId[id] = cur;
  }

  return { byProductId, error: null };
}
