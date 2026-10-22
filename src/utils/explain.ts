/**
 * Grounded dashboard explanations for "Talk to TIJAR".
 * Figures always come from the owner's real analytics queries; this
 * module only phrases them. No invented numbers, no LLM.
 */

export type MetricKind = "sales" | "expenses" | "profit" | "credit" | "health" | "today" | null;

export function parseExplainRequest(text: string): MetricKind {
  const t = text.toLowerCase();
  const asks = /\b(explain|what|how much|how many|tell me|show me|imaan|menene|nini|kini)\b/.test(t);
  if (!asks && !/\b(sales|expenses|profit|credit|debt|health|today)\b/.test(t)) return null;
  if (/\b(today|leo|yau|oni)\b/.test(t)) return "today";
  if (/\b(profit|riba|faida|ere)\b/.test(t)) return "profit";
  if (/\b(credit|debt|bashi|deni|gbese|mkopo)\b/.test(t)) return "credit";
  if (/\b(health|score|afya|lafiya|ilera)\b/.test(t)) return "health";
  if (/\b(expense|expenses|spent|gharama|kashe|inawo)\b/.test(t)) return "expenses";
  if (/\b(sale|sales|sold|mauzo|tallace|tita)\b/.test(t)) return "sales";
  return null;
}

export type BusinessFigures = {
  sales30: number;
  expenses30: number;
  profit30: number;
  salesToday: number;
  expensesToday: number;
  customerCreditTotal?: number | null;
  healthScore?: number | null;
  healthBand?: string | null;
};

const ngn = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export function buildExplanation(metric: Exclude<MetricKind, null>, f: BusinessFigures): string {
  switch (metric) {
    case "today":
      return `Today you have sold ${ngn(f.salesToday)} and spent ${ngn(f.expensesToday)}. That means today's profit so far is ${ngn(f.salesToday - f.expensesToday)}.`;
    case "sales":
      return `In the last 30 days, your total sales were ${ngn(f.sales30)}. Sales are all the money customers paid you for goods and services in that period.`;
    case "expenses":
      return `In the last 30 days, your total expenses were ${ngn(f.expenses30)}. Expenses are money that left the business, like transport, stock purchases and rent.`;
    case "profit":
      return `Your profit for the last 30 days is ${ngn(f.profit30)}. Profit means what is left after taking expenses of ${ngn(f.expenses30)} away from sales of ${ngn(f.sales30)}. ${f.profit30 < 0 ? "Your expenses were more than your sales, so the business lost money in this period." : "Your sales were more than your expenses, so the business made money in this period."}`;
    case "credit":
      return f.customerCreditTotal === null || f.customerCreditTotal === undefined
        ? "I do not have your customer credit total yet. Open Customers to see who still owes you money."
        : `Customers currently owe you ${ngn(f.customerCreditTotal)}. That is money you have already given goods for, but not yet been paid. Collecting it improves your cash for stock.`;
    case "health":
      return f.healthScore === null || f.healthScore === undefined
        ? "Your business health score is not ready yet. Record sales and expenses for a few days and TIJAR will calculate it."
        : `Your business health score is ${Math.round(f.healthScore)} out of 100${f.healthBand ? `, which is ${f.healthBand}` : ""}. It is based on your sales, expenses, profit and how much customers owe you in the last 30 days.`;
  }
}
