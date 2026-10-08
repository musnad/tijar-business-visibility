export type HealthBand = "strong" | "stable" | "watch" | "risk";

export type HealthInput = {
  periodDays: number;
  sales: number;
  expenses: number;
  profit: number;
  customerCreditTotal: number;
  supplierCreditTotal: number;
  transactionsInPeriod: number;
  daysSinceLastTransaction: number | null;
};

export type HealthResult = {
  score: number;
  band: HealthBand;
};

export type RecommendationDraft = {
  code: string;
  priority: number;
  actionPath?: string;
};

const CREDIT_TO_SALES_RATIO_WATCH = 0.35;
const CREDIT_TO_SALES_RATIO_RISK = 0.55;

export function computeBusinessHealth(input: HealthInput): HealthResult {
  let score = 72;

  if (input.transactionsInPeriod === 0) {
    score -= 28;
  } else if (input.transactionsInPeriod < 5) {
    score -= 12;
  } else if (input.transactionsInPeriod >= 20) {
    score += 8;
  }

  if (input.daysSinceLastTransaction !== null) {
    if (input.daysSinceLastTransaction > 14) score -= 18;
    else if (input.daysSinceLastTransaction > 7) score -= 10;
    else if (input.daysSinceLastTransaction <= 2) score += 4;
  }

  if (input.profit > 0) {
    score += 10;
    if (input.sales > 0 && input.profit / input.sales >= 0.15) score += 6;
  } else if (input.profit < 0) {
    score -= 16;
  }

  if (input.sales > 0) {
    const creditRatio = input.customerCreditTotal / input.sales;
    if (creditRatio >= CREDIT_TO_SALES_RATIO_RISK) score -= 22;
    else if (creditRatio >= CREDIT_TO_SALES_RATIO_WATCH) score -= 12;
    else if (input.customerCreditTotal === 0) score += 4;
  } else if (input.customerCreditTotal > 0) {
    score -= 14;
  }

  if (input.supplierCreditTotal > 0 && input.profit > 0) {
    const supplierPressure = input.supplierCreditTotal / Math.max(input.profit, 1);
    if (supplierPressure > 2) score -= 10;
    else if (supplierPressure > 1) score -= 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let band: HealthBand = "stable";
  if (score >= 80) band = "strong";
  else if (score >= 60) band = "stable";
  else if (score >= 40) band = "watch";
  else band = "risk";

  return { score, band };
}

export function buildRecommendationDrafts(input: HealthInput): RecommendationDraft[] {
  const drafts: RecommendationDraft[] = [];

  if (input.customerCreditTotal > 0) {
    drafts.push({
      code: "collect_customer_credit",
      priority: 90,
      actionPath: "/app/customers",
    });
  }

  if (input.sales > 0 && input.customerCreditTotal / input.sales >= CREDIT_TO_SALES_RATIO_WATCH) {
    drafts.push({
      code: "credit_high_vs_sales",
      priority: 85,
      actionPath: "/app/customers",
    });
  }

  if (input.profit < 0 && input.expenses > 0) {
    drafts.push({
      code: "review_expenses",
      priority: 80,
      actionPath: "/app/expenses",
    });
  }

  if (input.transactionsInPeriod === 0 || (input.daysSinceLastTransaction ?? 0) > 7) {
    drafts.push({
      code: "record_more_often",
      priority: 70,
      actionPath: "/app/sales",
    });
  }

  if (input.supplierCreditTotal > 0) {
    drafts.push({
      code: "plan_supplier_payments",
      priority: 65,
      actionPath: "/app/suppliers",
    });
  }

  if (input.profit > 0 && input.sales > input.expenses * 1.2) {
    drafts.push({
      code: "profit_healthy",
      priority: 20,
    });
  }

  return drafts.sort((a, b) => b.priority - a.priority);
}
