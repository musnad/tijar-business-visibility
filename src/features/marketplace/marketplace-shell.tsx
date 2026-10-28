"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, Package, ShoppingCart, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { TijarLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { AppLanguageButton } from "@/features/app-layout/app-language-button";
import { AccountModeSwitch } from "@/features/marketplace/account-mode-switch";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function MarketplaceTopBar() {
  const { profile, session } = useAuth();
  const name = profile?.full_name ?? "";

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2 pb-3">
      <Link
        to="/discover"
        className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-[10px] font-bold text-muted-foreground"
        aria-label="Discover shops"
      >
        Map
      </Link>

      <div className="flex justify-center px-1">
        <Link to="/shop" className="block max-w-[140px]">
          <TijarLogo compact className="mx-auto max-w-[140px]" />
        </Link>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <AccountModeSwitch className="hidden sm:inline-flex" />
        <AppLanguageButton />
        {!session ? (
          <Button size="sm" className="h-9 rounded-full px-3 text-xs font-bold" asChild>
            <Link to="/register" search={{ intent: "customer" } as never}>
              Sign up
            </Link>
          </Button>
        ) : (
          <Link
            to="/shop/profile"
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-xs font-bold text-primary"
            aria-label="Profile"
          >
            {initials(name)}
          </Link>
        )}
      </div>
    </header>
  );
}

export function MarketplaceShell({
  children,
  cartCount = 0,
  hideTopBar = false,
}: {
  children: ReactNode;
  cartCount?: number;
  hideTopBar?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/shop", label: "Home", icon: Home, exact: true },
    { to: "/shop/favorites", label: "Saved", icon: Heart },
    { to: "/shop/cart", label: "Cart", icon: ShoppingCart, badge: cartCount },
    { to: "/shop/orders", label: "Orders", icon: Package },
    { to: "/shop/profile", label: "Me", icon: UserRound },
  ] as const;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-4 pt-3 sm:px-5">
        {!hideTopBar && <MarketplaceTopBar />}
        {children}
      </main>

      <nav className="app-bottom-nav sticky bottom-0 border-t border-border bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-sm">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0 px-2">
          {tabs.map((tab) => {
            const active =
              "exact" in tab && tab.exact
                ? pathname === "/shop" || pathname === "/shop/"
                : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "app-tab relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                  active ? "app-tab-active text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                {tab.label}
                {"badge" in tab && tab.badge && tab.badge > 0 ? (
                  <span className="absolute right-[18%] top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
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
