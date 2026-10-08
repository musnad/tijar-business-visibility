/** Map stored DNA slugs to onboarding i18n keys (fallback: humanize slug). */
const KEY_BY_ID: Record<string, string> = {
  retail: "onboarding.revenue.retail",
  service: "onboarding.revenue.service",
  food: "onboarding.revenue.food",
  wholesale: "onboarding.revenue.wholesale",
  other: "onboarding.revenue.other",
  cash: "onboarding.payments.cash",
  transfer: "onboarding.payments.transfer",
  pos: "onboarding.payments.pos",
  credit: "onboarding.payments.credit",
  mobile_money: "onboarding.payments.mobileMoney",
  walk_in: "onboarding.discovery.walkIn",
  whatsapp: "onboarding.discovery.whatsapp",
  social: "onboarding.discovery.social",
  referral: "onboarding.discovery.referral",
  market: "onboarding.discovery.market",
  increase_sales: "onboarding.goals.increaseSales",
  increase_profit: "onboarding.goals.increaseProfit",
  manage_expenses: "onboarding.goals.manageExpenses",
  manage_debt: "onboarding.goals.manageDebt",
  improve_records: "onboarding.goals.improveRecords",
  more_customers: "onboarding.goals.moreCustomers",
};

export function translateDnaSlug(t: (key: string) => string, slug: string): string {
  const key = KEY_BY_ID[slug];
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  return slug.replace(/_/g, " ");
}

export function translateDnaList(t: (key: string) => string, slugs: string[]): string[] {
  return slugs.map((s) => translateDnaSlug(t, s));
}
