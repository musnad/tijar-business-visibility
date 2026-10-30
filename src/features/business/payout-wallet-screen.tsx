"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { NG_BANKS } from "@/lib/payments/ng-banks";
import {
  fetchSellerWallet,
  requestSellerPayout,
  saveBusinessPayoutAccount,
} from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";
import type { Business } from "@/types/database";

export function PayoutWalletScreen({ business }: { business: Business }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(business.payout_account_name ?? "");
  const [number, setNumber] = useState(business.payout_account_number ?? "");
  const [bankCode, setBankCode] = useState(business.payout_bank_code ?? "058");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);

  const walletQuery = useQuery({
    queryKey: ["seller-wallet", business.id],
    queryFn: async () => fetchSellerWallet(business.id),
  });
  const wallet = walletQuery.data?.wallet;
  const requests = walletQuery.data?.requests ?? [];
  const bank = NG_BANKS.find((b) => b.code === bankCode);

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
    if (error) toast.error(error);
    else toast.success("Buyers can now transfer to this account.");
  }

  async function payout() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 100) {
      toast.error("Enter at least ₦100.");
      return;
    }
    setPaying(true);
    const res = await requestSellerPayout(business.id, n);
    setPaying(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.message || "Payout sent.");
      setAmount("");
      await queryClient.invalidateQueries({ queryKey: ["seller-wallet", business.id] });
    }
  }

  return (
    <>
      <AppPageHeader
        title="Wallet & payouts"
        subtitle="Buyers can transfer to your bank, or pay on Flutterwave. You request a payout anytime."
      />

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Available</p>
        <p className="mt-1 text-3xl font-extrabold text-[#0B1F4D]">{formatNgn(Number(wallet?.available_ngn ?? 0))}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pending: {formatNgn(Number(wallet?.pending_ngn ?? 0))}
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            className="min-h-11 rounded-xl"
            inputMode="numeric"
            placeholder="Amount to withdraw"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button className="min-h-11 rounded-xl bg-[#1F7A4D]" disabled={paying} onClick={() => void payout()}>
            {paying ? "Sending…" : "Request payout"}
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold">Your bank account</h2>
        <p className="mt-1 text-xs text-muted-foreground">Shown to buyers who choose “Transfer to this shop”.</p>
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
          {saving ? "Saving…" : "Save account"}
        </Button>
      </section>

      <section className="mt-4 pb-8">
        <h2 className="text-sm font-extrabold">Payout history</h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No payouts yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                <span className="font-bold">{formatNgn(Number(r.amount_ngn))}</span>
                <span className="capitalize text-muted-foreground">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
