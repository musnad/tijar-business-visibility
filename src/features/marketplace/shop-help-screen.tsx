"use client";

import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";

const TOPICS = [
  {
    title: "Your profile",
    body: "Name, photo, and bio help shops know who they are talking to. You can hide location until you add an address.",
  },
  {
    title: "Privacy",
    body: "Chats are only between you and the shop. TIJAR does not sell your personal data. Turn alerts off in Settings anytime.",
  },
  {
    title: "Orders and saved items",
    body: "My Orders tracks purchases. Saved Products keeps listings you add to cart or heart. Following is shops and people you follow. Followers is who follows you or your shop.",
  },
  {
    title: "Selling",
    body: "Sell is for approved business accounts. If you do not have one, send a request from Sell. An admin must approve it first.",
  },
  {
    title: "Safety",
    body: "Never pay outside TIJAR checkout if you do not know the seller. Report a shop from their storefront if something is wrong.",
  },
];

export function ShopHelpScreen() {
  return (
    <MarketplaceShell hideTopBar variant="feed">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-[max(0.5rem,env(safe-area-inset-top))]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Link
          to="/shop/profile"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Profile
        </Link>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-[color:var(--brand-navy,#001B3A)]">Help</h1>
        <p className="mt-1 text-sm text-muted-foreground">How TIJAR works for shoppers and sellers.</p>
        <ul className="mt-5 space-y-3">
          {TOPICS.map((topic) => (
            <li key={topic.title} className="rounded-2xl border border-border bg-white p-4">
              <p className="font-extrabold text-[color:var(--brand-navy,#001B3A)]">{topic.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{topic.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </MarketplaceShell>
  );
}
