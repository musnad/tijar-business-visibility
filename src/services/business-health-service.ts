import {
  buildRecommendationDrafts,
  computeBusinessHealth,
  type HealthBand,
} from "@/features/insights/compute-business-health";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchPeriodAnalytics } from "@/services/transaction-service";

export type BusinessHealthDashboard = {
  periodDays: number;
  sales: number;
  expenses: number;
  profit: number;
  customerCreditTotal: number;
  supplierCreditTotal: number;
  customersOwingCount: number;
  suppliersOwingCount: number;
  transactionsInPeriod: number;
  daysSinceLastTransaction: number | null;
  healthScore: number;
  healthBand: HealthBand;
  recommendations: {
    id: string;
    code: string;
    title: string;
    body: string;
    priority: number;
    actionPath: string | null;
  }[];
};

const RECOMMENDATION_COPY: Record<
  string,
  { titleKey: string; bodyKey: string }
> = {
  collect_customer_credit: {
    titleKey: "app.health.reco.collectCreditTitle",
    bodyKey: "app.health.reco.collectCreditBody",
  },
  credit_high_vs_sales: {
    titleKey: "app.health.reco.creditRatioTitle",
    bodyKey: "app.health.reco.creditRatioBody",
  },
  review_expenses: {
    titleKey: "app.health.reco.reviewExpensesTitle",
    bodyKey: "app.health.reco.reviewExpensesBody",
  },
  record_more_often: {
    titleKey: "app.health.reco.recordMoreTitle",
    bodyKey: "app.health.reco.recordMoreBody",
  },
  plan_supplier_payments: {
    titleKey: "app.health.reco.supplierPayTitle",
    bodyKey: "app.health.reco.supplierPayBody",
  },
  profit_healthy: {
    titleKey: "app.health.reco.profitHealthyTitle",
    bodyKey: "app.health.reco.profitHealthyBody",
  },
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function sumCreditBalances(businessId: string): Promise<{
  customerCreditTotal: number;
  supplierCreditTotal: number;
  customersOwingCount: number;
  suppliersOwingCount: number;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const [customersRes, suppliersRes] = await Promise.all([
    supabase.from("customers").select("balance_owed").eq("business_id", businessId),
    supabase.from("suppliers").select("balance_owed").eq("business_id", businessId),
  ]);

  if (customersRes.error) {
    return {
      customerCreditTotal: 0,
      supplierCreditTotal: 0,
      customersOwingCount: 0,
      suppliersOwingCount: 0,
      error: customersRes.error.message,
    };
  }
  if (suppliersRes.error) {
    return {
      customerCreditTotal: 0,
      supplierCreditTotal: 0,
      customersOwingCount: 0,
      suppliersOwingCount: 0,
      error: suppliersRes.error.message,
    };
  }

  const customerRows = customersRes.data ?? [];
  const supplierRows = suppliersRes.data ?? [];
  const owingCustomers = customerRows.filter((c) => Number(c.balance_owed) > 0);
  const owingSuppliers = supplierRows.filter((s) => Number(s.balance_owed) > 0);

  return {
    customerCreditTotal: owingCustomers.reduce((s, c) => s + Number(c.balance_owed), 0),
    supplierCreditTotal: owingSuppliers.reduce((s, r) => s + Number(r.balance_owed), 0),
    customersOwingCount: owingCustomers.length,
    suppliersOwingCount: owingSuppliers.length,
    error: null,
  };
}

async function countTransactionsSince(businessId: string, sinceIso: string): Promise<{
  count: number;
  lastOccurredAt: string | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_at")
    .eq("business_id", businessId)
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: false });

  if (error) return { count: 0, lastOccurredAt: null, error: error.message };
  const rows = data ?? [];
  return {
    count: rows.length,
    lastOccurredAt: rows[0]?.occurred_at ?? null,
    error: null,
  };
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function fetchBusinessHealthDashboard(
  businessId: string,
  periodDays = 30,
  t: (key: string) => string,
): Promise<{ data: BusinessHealthDashboard | null; error: string | null }> {
  const sinceIso = daysAgoIso(periodDays);

  const [analytics, credits, txMeta] = await Promise.all([
    fetchPeriodAnalytics(businessId, periodDays),
    sumCreditBalances(businessId),
    countTransactionsSince(businessId, sinceIso),
  ]);

  const err = analytics.error ?? credits.error ?? txMeta.error;
  if (err) return { data: null, error: err };

  const { sales, expenses, profit } = analytics.current;
  const daysSinceLastTransaction = daysSince(txMeta.lastOccurredAt);

  const healthInput = {
    periodDays,
    sales,
    expenses,
    profit,
    customerCreditTotal: credits.customerCreditTotal,
    supplierCreditTotal: credits.supplierCreditTotal,
    transactionsInPeriod: txMeta.count,
    daysSinceLastTransaction,
  };

  const { score, band } = computeBusinessHealth(healthInput);
  const drafts = buildRecommendationDrafts(healthInput).slice(0, 4);

  const supabase = getSupabaseBrowserClient();

  const snapshotRes = await supabase.from("business_health_snapshots").insert({
    business_id: businessId,
    period_days: periodDays,
    total_sales: sales,
    total_expenses: expenses,
    profit,
    customer_credit_total: credits.customerCreditTotal,
    supplier_credit_total: credits.supplierCreditTotal,
    transactions_in_period: txMeta.count,
    health_score: score,
    health_band: band,
  });

  const dbAvailable = !snapshotRes.error;

  if (dbAvailable) {
    for (const draft of drafts) {
      const copy = RECOMMENDATION_COPY[draft.code];
      if (!copy) continue;
      await supabase.from("business_recommendations").upsert(
        {
          business_id: businessId,
          code: draft.code,
          title: t(copy.titleKey),
          body: t(copy.bodyKey),
          priority: draft.priority,
          action_path: draft.actionPath ?? null,
        },
        { onConflict: "business_id,code" },
      );
    }
  }

  let recommendations: BusinessHealthDashboard["recommendations"] = [];

  if (dbAvailable) {
    const { data: recoRows, error: recoError } = await supabase
      .from("business_recommendations")
      .select("id, code, title, body, priority, action_path")
      .eq("business_id", businessId)
      .is("dismissed_at", null)
      .order("priority", { ascending: false })
      .limit(4);

    if (recoError) return { data: null, error: recoError.message };

    recommendations = (recoRows ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      body: r.body,
      priority: r.priority,
      actionPath: r.action_path,
    }));
  } else {
    recommendations = draftsToDisplay(drafts, t);
  }

  return {
    data: {
      periodDays,
      sales,
      expenses,
      profit,
      customerCreditTotal: credits.customerCreditTotal,
      supplierCreditTotal: credits.supplierCreditTotal,
      customersOwingCount: credits.customersOwingCount,
      suppliersOwingCount: credits.suppliersOwingCount,
      transactionsInPeriod: txMeta.count,
      daysSinceLastTransaction,
      healthScore: score,
      healthBand: band,
      recommendations,
    },
    error: null,
  };
}

function draftsToDisplay(
  drafts: ReturnType<typeof buildRecommendationDrafts>,
  t: (key: string) => string,
): BusinessHealthDashboard["recommendations"] {
  return drafts.map((draft) => {
    const copy = RECOMMENDATION_COPY[draft.code];
    return {
      id: draft.code,
      code: draft.code,
      title: copy ? t(copy.titleKey) : draft.code,
      body: copy ? t(copy.bodyKey) : "",
      priority: draft.priority,
      actionPath: draft.actionPath ?? null,
    };
  });
}

export async function dismissRecommendation(
  recommendationId: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("business_recommendations")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", recommendationId);
  return { error: error?.message ?? null };
}
