"use client";

import { Link } from "@tanstack/react-router";
import { ChevronRight, Landmark } from "lucide-react";

import type { Business } from "@/types/database";

export function BankAccountCard({ business }: { business: Business }) {
  const number = business.payout_account_number?.trim() ?? "";
  const saved = number.length >= 8;

  return (
    <Link
      to="/app/business/payouts"
      className="mt-4 block overflow-hidden rounded-2xl border-2 border-[#1F7A4D] bg-[#1F7A4D]/8 shadow-sm"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F7A4D] text-white">
          <Landmark className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#1F7A4D]">Bank account</p>
          <p className="mt-0.5 text-base font-extrabold text-[#0B1F4D]">
            {saved ? "Account number buyers transfer to" : "Add the account number buyers transfer to"}
          </p>
          {saved ? (
            <dl className="mt-2 space-y-0.5 text-sm">
              {business.payout_bank_name ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Bank</dt>
                  <dd className="font-bold text-[#0B1F4D]">{business.payout_bank_name}</dd>
                </div>
              ) : null}
              {business.payout_account_name ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="truncate font-bold text-[#0B1F4D]">{business.payout_account_name}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Number</dt>
                <dd className="font-extrabold tracking-wide text-[#0B1F4D]">{number}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Buyers see this on checkout. Save it so they can transfer.
            </p>
          )}
          <span className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#1F7A4D] text-sm font-bold text-white">
            {saved ? "Edit bank account" : "Add bank account"}
          </span>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-[#1F7A4D]" />
      </div>
    </Link>
  );
}
