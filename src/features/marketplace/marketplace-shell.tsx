"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Heart, Home, Mail, PlusSquare, ShoppingBag, UserRound, Clapperboard } from "lucide-react";
import type { ReactNode } from "react";

import { TijarLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { AppLanguageButton } from "@/features/app-layout/app-language-button";
import { AccountModeSwitch } from "@/features/marketplace/account-mode-switch";
import { useAuth } from "@/features/auth/auth-context";
import { canUseBusinessMode } from "@/lib/account-mode";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function MarketplaceTopBar({ leftSlot }: { leftSlot?: ReactNode }) {
  const { profile, session } = useAuth();
  const name = profile?.full_name ?? "";

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2 pb-3">
      {leftSlot ?? <div className="size-10" />}

      <div className="flex justify-center px-1">
        <Link to="/shop" className="block max-w-[140px]">
          <TijarLogo compact className="mx-auto max-w-[140px]" />
        </Link>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <AccountModeSwitch className="hidden min-[420px]:inline-flex" />
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
  mapLayout = false,
  leftSlot,
  variant = "page",
}: {
  children: ReactNode;
  cartCount?: number;
  hideTopBar?: boolean;
  mapLayout?: boolean;
  leftSlot?: ReactNode;
  variant?: "page" | "feed";
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile } = useAuth();
  const showCreate = canUseBusinessMode(profile);
  const feed = variant === "feed";

  const tabs = feed
    ? [
        { to: "/shop" as const, label: "Home", icon: Home, exact: true },
        { to: "/shop/discover" as const, label: "Explore", icon: Compass },
        { to: (showCreate ? "/shop/create" : "/shop/favorites") as const, label: "Sell", icon: Heart },
        { to: "/shop/enquiries" as const, label: "Messages", icon: Mail, badge: cartCount },
        { to: "/shop/profile" as const, label: "Profile", icon: UserRound },
      ]
    : [
        { to: "/shop" as const, label: "For You", icon: Clapperboard, exact: true },
        { to: "/shop/discover" as const, label: "Discover", icon: Compass },
        ...(showCreate ? [{ to: "/shop/create" as const, label: "Create", icon: PlusSquare }] : []),
        { to: "/shop/browse" as const, label: "Shop", icon: ShoppingBag, badge: cartCount },
        { to: "/shop/profile" as const, label: "Profile", icon: UserRound },
      ];

  return (
    <div className={cn("flex min-h-dvh flex-col", feed && "h-full max-h-dvh overflow-hidden", feed ? "bg-white text-foreground" : "bg-background text-foreground")}>
      <main
        className={cn(
          "mx-auto w-full flex-1",
          feed
            ? "flex max-w-lg min-h-0 flex-col p-0"
            : cn(
                "max-w-lg pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 lg:max-w-6xl xl:max-w-7xl",
                mapLayout ? "px-2 pb-2" : "px-4 pb-4",
              ),
        )}
      >
        {!hideTopBar && !feed && <MarketplaceTopBar leftSlot={leftSlot} />}
        {children}
      </main>

      <nav
        className={cn(
          "z-40 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1",
          feed
            ? "relative border-t border-border bg-white pb-[max(0.55rem,env(safe-area-inset-bottom))]"
            : "sticky bottom-0 app-bottom-nav border-t border-border bg-background/95 backdrop-blur-sm",
        )}
        aria-label="Marketplace"
      >
        <div className={cn("mx-auto grid max-w-lg gap-0 px-1", feed || showCreate ? "grid-cols-5" : "grid-cols-4")}>
          {tabs.map((tab) => {
            const active =
              "exact" in tab && tab.exact
                ? pathname === "/shop" || pathname === "/shop/"
                : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={`${tab.to}-${tab.label}`}
                to={tab.to}
                className={cn(
                  "relative flex min-h-11 min-w-11 touch-manipulation flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                {tab.label}
                {"badge" in tab && tab.badge && tab.badge > 0 ? (
                  <span className="absolute right-[18%] top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
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
