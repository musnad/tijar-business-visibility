import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function countTransactions(
  businessId: string,
  type?: "sale" | "expense",
): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  let q = supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  if (type) q = q.eq("type", type);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export async function checkMissionProgress(
  businessId: string,
  missionType: "sale" | "expense" | "sale_count",
  target: number,
): Promise<{ met: boolean; current: number }> {
  if (missionType === "sale") {
    const n = await countTransactions(businessId, "sale");
    return { met: n >= target, current: n };
  }
  if (missionType === "expense") {
    const n = await countTransactions(businessId, "expense");
    return { met: n >= target, current: n };
  }
  const n = await countTransactions(businessId, "sale");
  return { met: n >= target, current: n };
}
