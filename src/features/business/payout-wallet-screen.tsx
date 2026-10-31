"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BankAccountForm } from "@/features/business/bank-account-form";
import { displayShopName } from "@/lib/shop-names";
import { fetchOwnedBusinesses } from "@/services/business-service";
import { fetchSellerOrders } from "@/services/seller-dashboard-service";
import { fetchTodayTotals, listRecentTransactions } from "@/services/transaction-service";
import { formatNgn } from "@/utils/money";
import type { Business } from "@/types/database";

export function PayoutWalletScreen({
  business,
  profileId,
}: {
  business: Business;
  profileId?: string;
}) {
  const shopsQuery = useQuery({
    queryKey: ["owned-businesses", profileId],
    enabled: Boolean(profileId),
    queryFn: async () => {
      const r = await fetchOwnedBusinesses(profileId!);
      if (r.error && r.businesses.length === 0) throw new Error(r.error);
      return r.businesses.length ? r.businesses : [business];
    },
  });
  const shops = shopsQuery.data?.length ? shopsQuery.data : [business];
  const [selectedId, setSelectedId] = useState(business.id);
  const selected = useMemo(
    () => shops.find((s) => s.id === selectedId) ?? shops[0] ?? business,
    [shops, selectedId, business],
  );

  const salesQuery = useQuery({
    queryKey: ["shop-payout-sales", selected.id],
    queryFn: async () => {
      const [today, txs, orders] = await Promise.all([
        fetchTodayTotals(selected.id),
        listRecentTransactions(selected.id, 30),
        fetchSellerOrders(selected.id),
      ]);
      return {
        todaySales: today.sales,
        transactions: txs.data.filter((t) => t.type === "sale"),
        orders: orders.orders,
        error: today.error || txs.error || orders.error,
      };
    },
  });

  const shopSales = salesQuery.data?.transactions ?? [];
  const todaySales = salesQuery.data?.todaySales ?? 0;
  const pendingConfirms = (salesQuery.data?.orders ?? []).filter(
    (o) => o.status === "pending_payment" && o.buyer_marked_paid_at,
  ).length;
  const shopName = displayShopName(selected.business_name);

  return (
    <>
      <AppPageHeader
        title="Bank account"
        subtitle={`${shopName} — this is the account number buyers transfer to for this shop.`}
      />

      {shops.length > 1 ? (
        <label className="mt-4 block text-xs font-bold">
          Shop
          <select
            className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold"
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {displayShopName(s.business_name)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Today’s shop sales</p>
        <p className="mt-1 text-3xl font-extrabold text-[#0B1F4D]">{formatNgn(todaySales)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendingConfirms > 0
            ? `${pendingConfirms} transfer${pendingConfirms === 1 ? "" : "s"} waiting for you to confirm`
            : "Confirmed transfers land here automatically"}
        </p>
        <Button className="mt-3 min-h-11 w-full rounded-xl" variant="outline" asChild>
          <Link to="/app/orders">Open orders</Link>
        </Button>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold">Bank account for {shopName}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {selected.payout_account_number
            ? "This number is shown to buyers on checkout for this shop."
            : "Save this before customers can transfer to this shop."}
        </p>
        <BankAccountForm key={selected.id} business={selected} />
      </section>

      <section className="mt-4 pb-8">
        <h2 className="text-sm font-extrabold">Shop transactions</h2>
        {salesQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading sales…</p>
        ) : shopSales.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No shop sales yet. When you confirm a transfer, it appears here and on today’s sales.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {shopSales.map((row) => (
              <li key={row.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{row.description || "Shop sale"}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(row.occurred_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    {row.payment_method ? ` · ${row.payment_method}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-extrabold text-[#1F7A4D]">{formatNgn(Number(row.amount))}</span>
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-3 min-h-11 w-full rounded-xl" variant="outline" asChild>
          <Link to="/app/transactions">All transactions</Link>
        </Button>
      </section>
    </>
  );
}
