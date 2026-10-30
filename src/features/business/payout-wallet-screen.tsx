"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { NG_BANKS } from "@/lib/payments/ng-banks";
import { saveBusinessPayoutAccount } from "@/services/marketplace-service";
import type { Business } from "@/types/database";

export function PayoutWalletScreen({ business }: { business: Business }) {
  const [name, setName] = useState(business.payout_account_name ?? "");
  const [number, setNumber] = useState(business.payout_account_number ?? "");
  const [bankCode, setBankCode] = useState(business.payout_bank_code ?? "058");
  const [saving, setSaving] = useState(false);
  const bank = NG_BANKS.find((b) => b.code === bankCode);
  const saved = Boolean(business.payout_account_number);

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
    else toast.success("Buyers will see this account when they buy.");
  }

  return (
    <>
      <AppPageHeader
        title="Bank account"
        subtitle="Buyers transfer into this account. When they tap Paid now, confirm it on Orders so it records in today’s sales."
      />

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-extrabold">Account buyers will see</h2>
        {saved ? (
          <p className="mt-1 text-xs text-[#1F7A4D]">
            Live: {business.payout_bank_name} · {business.payout_account_number}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Save this before customers can complete a transfer.
          </p>
        )}
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
    </>
  );
}
