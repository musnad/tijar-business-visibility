import { profileAccountMode } from "@/lib/account-mode";
import { platformCommission } from "@/lib/admin";
import type { AdminOrder, AdminTransaction } from "@/services/admin-service";
import type { Business, Profile } from "@/types/database";

export type AccountCategory = "customer" | "business" | "both";

export function isCountableMoneyStatus(status?: string | null): boolean {
  const s = (status ?? "").toLowerCase();
  if (!s) return true;
  return !s.includes("cancel") && !s.includes("refund") && s !== "failed";
}

export function accountCategory(profile: Profile, businesses: Business[]): AccountCategory {
  const mode = profileAccountMode(profile);
  const ownsShop = businesses.some((b) => b.owner_id === profile.id);
  if (mode === "both" || (ownsShop && mode === "customer")) return "both";
  if (mode === "business" || ownsShop) return "business";
  return "customer";
}

export function categoryLabel(kind: AccountCategory): string {
  if (kind === "both") return "Customer + Business";
  if (kind === "business") return "Business";
  return "Customer";
}

export function userSpend(profileId: string, orders: AdminOrder[]): number {
  return orders
    .filter((o) => o.buyer_profile_id === profileId && isCountableMoneyStatus(o.status))
    .reduce((n, o) => n + Number(o.total), 0);
}

export function businessLedgerSales(businessId: string, transactions: AdminTransaction[]): number {
  return transactions
    .filter((t) => t.business_id === businessId && t.type === "sale")
    .reduce((n, t) => n + Number(t.amount), 0);
}

export function businessMarketplaceSales(businessId: string, orders: AdminOrder[]): number {
  return orders
    .filter((o) => o.business_id === businessId && isCountableMoneyStatus(o.status))
    .reduce((n, o) => n + Number(o.total), 0);
}

export function businessGross(
  businessId: string,
  transactions: AdminTransaction[],
  orders: AdminOrder[],
): number {
  return businessLedgerSales(businessId, transactions) + businessMarketplaceSales(businessId, orders);
}

export function commissionOnAmount(amount: number, rate: number): number {
  return platformCommission(amount, rate);
}

export function totalsForFinance(
  transactions: AdminTransaction[],
  orders: AdminOrder[],
  rate: number,
) {
  const ledgerSales = transactions
    .filter((t) => t.type === "sale")
    .reduce((n, t) => n + Number(t.amount), 0);
  const marketplaceGmv = orders
    .filter((o) => isCountableMoneyStatus(o.status))
    .reduce((n, o) => n + Number(o.total), 0);
  const userSpendTotal = marketplaceGmv;
  const ledgerCommission = commissionOnAmount(ledgerSales, rate);
  const marketplaceCommission = commissionOnAmount(marketplaceGmv, rate);
  return {
    ledgerSales,
    marketplaceGmv,
    userSpendTotal,
    businessGross: ledgerSales + marketplaceGmv,
    ledgerCommission,
    marketplaceCommission,
    totalCommission: ledgerCommission + marketplaceCommission,
    businessNet: ledgerSales + marketplaceGmv - (ledgerCommission + marketplaceCommission),
  };
}
