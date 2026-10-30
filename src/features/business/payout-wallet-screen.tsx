"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { NG_BANKS } from "@/lib/payments/ng-banks";
import { fetchSellerOrders } from "@/services/seller-dashboard-service";
import { saveBusinessPayoutAccount } from "@/services/marketplace-service";
import { fetchTodayTotals, listRecentTransactions } from "@/services/transaction-service";
import { formatNgn } from "@/utils/money";
import type { Business } from "@/types/database";

export function PayoutWalletScreen({ business }: { business: Business }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(business.payout_account_name ?? "");
  const [number, setNumber] = useState(business.payout_account_number ?? "");
  const [bankCode, setBankCode] = useState(business.payout_bank_code ?? "058");
  const [saving, setSaving] = useState(false);
  const bank = NG_BANKS.find((b) => b.code === bankCode);

  const salesQuery = useQuery({
    queryKey: ["shop-payout-sales", business.id],
    queryFn: async () => {
      const [today, txs, orders] = await Promise.all([
        fetchTodayTotals(business.id),
        listRecentTransactions(business.id, 30),
        fetchSellerOrders(business.id),
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
  const liveNumber = number.replace(/\s+/g, "").length >= 8;

  async function saveAccount() {
    if (!name.trim() || number.replace(/\s+/g, "").length < 8) {
      toast.error("Enter the account name and number.");
      return;
    }
    setSaving(true);
    const { error } = await saveBusinessPayoutAccount(business.id, {
      payout_account_name: name,
      payout_account_number: number,
      payout_bank_name: bank?.name ?? "Bank",
      payout_bank_code: bankCode,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Bank account saved. Buyers will see this when they pay.");
    await queryClient.invalidateQueries({ queryKey: ["primary-business"] });
    await queryClient.invalidateQueries({ queryKey: ["payout-account", business.id] });
  }

  return (
    <>
      <AppPageHeader
        title="Shop payouts"
        subtitle={`${business.business_name} — add the account buyers transfer to, then confirm sales on Orders.`}
      />

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
        <h2 className="text-sm font-extrabold">Bank account</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {liveNumber ? "This number is shown to buyers on checkout." : "Save this before customers can transfer."}
        </p>
        <label className="mt-3 block text-xs font-bold">Account name</label>
        <Input className="mt-1 min-h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="mt-3 block text-xs font-bold">Account number</label>
        <Input className="mt-1 min-h-11 rounded-xl" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
        <label className="mt-3 block text-xs font-bold">Bank</label>
        <select
          className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
        >
          {NG_BANKS.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
        <Button className="mt-3 min-h-11 w-full rounded-xl" disabled={saving} onClick={() => void saveAccount()}>
          {saving ? "Saving…" : "Save bank account"}
        </Button>
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
