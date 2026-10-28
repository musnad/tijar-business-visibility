"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, Package, ShoppingCart, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { AccountModeSwitch } from "@/features/marketplace/account-mode-switch";
import { cn } from "@/lib/utils";

export function MarketplaceShell({
  children,
  cartCount = 0,
}: {
  children: ReactNode;
  cartCount?: number;
}) {
  const { session } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/shop", label: "Home", icon: Home },
    { to: "/shop/favorites", label: "Saved", icon: Heart },
    { to: "/shop/cart", label: "Cart", icon: ShoppingCart, badge: cartCount },
    { to: "/shop/orders", label: "Orders", icon: Package },
    { to: "/shop/profile", label: "Me", icon: UserRound },
  ] as const;

  return (
    <div className="min-h-dvh bg-[#f6f7f9] text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <BrandMark compact />
          <div className="flex items-center gap-2">
            <AccountModeSwitch />
            {!session && (
              <Button size="sm" className="rounded-xl font-bold" asChild>
                <Link to="/register" search={{ intent: "customer" } as never}>
                  Sign up
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          {tabs.map((tab) => {
            const active = pathname === tab.to || (tab.to !== "/shop" && pathname.startsWith(tab.to));
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-bold",
                  active ? "text-teal-800" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {tab.label}
                {"badge" in tab && tab.badge && tab.badge > 0 ? (
                  <span className="absolute right-3 top-1 flex size-4 items-center justify-center rounded-full bg-teal-700 text-[9px] text-white">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
