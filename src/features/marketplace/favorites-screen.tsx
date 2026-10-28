"use client";

import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { useAuth } from "@/features/auth/auth-context";

export function FavoritesScreen() {
  const { session } = useAuth();

  return (
    <MarketplaceShell>
      <h1 className="text-xl font-extrabold">Favorites</h1>
      {!session ? (
        <p className="mt-4 text-sm">
          <Link to="/login" className="font-bold text-teal-800">
            Sign in
          </Link>{" "}
          to save products.
        </p>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Tap the heart on a product to save it. Favorites sync to your TIJAR account.
          </p>
          <Button className="mt-4 rounded-xl font-bold" asChild>
            <Link to="/shop">Browse products</Link>
          </Button>
        </div>
      )}
    </MarketplaceShell>
  );
}
