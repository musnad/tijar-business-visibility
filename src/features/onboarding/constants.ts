/** Simpler options — fewer taps, still maps to full Business DNA in the database. */

export const REVENUE_MODEL_OPTIONS = [
  { id: "retail", labelKey: "onboarding.revenue.retail" },
  { id: "service", labelKey: "onboarding.revenue.service" },
  { id: "food", labelKey: "onboarding.revenue.food" },
  { id: "wholesale", labelKey: "onboarding.revenue.wholesale" },
  { id: "other", labelKey: "onboarding.revenue.other" },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { id: "cash", labelKey: "onboarding.payments.cash" },
  { id: "transfer", labelKey: "onboarding.payments.transfer" },
  { id: "pos", labelKey: "onboarding.payments.pos" },
  { id: "credit", labelKey: "onboarding.payments.credit" },
  { id: "mobile_money", labelKey: "onboarding.payments.mobileMoney" },
] as const;

export const DISCOVERY_CHANNEL_OPTIONS = [
  { id: "walk_in", labelKey: "onboarding.discovery.walkIn" },
  { id: "whatsapp", labelKey: "onboarding.discovery.whatsapp" },
  { id: "social", labelKey: "onboarding.discovery.social" },
  { id: "referral", labelKey: "onboarding.discovery.referral" },
  { id: "market", labelKey: "onboarding.discovery.market" },
  { id: "other", labelKey: "onboarding.discovery.other" },
] as const;

export const GOAL_OPTIONS = [
  { id: "increase_sales", labelKey: "onboarding.goals.increaseSales" },
  { id: "increase_profit", labelKey: "onboarding.goals.increaseProfit" },
  { id: "manage_expenses", labelKey: "onboarding.goals.manageExpenses" },
  { id: "manage_debt", labelKey: "onboarding.goals.manageDebt" },
  { id: "improve_records", labelKey: "onboarding.goals.improveRecords" },
  { id: "more_customers", labelKey: "onboarding.goals.moreCustomers" },
] as const;

/** 9 simple steps (was 14). */
export const ONBOARDING_STEP_COUNT = 9;

export const MAX_GOALS = 2;
