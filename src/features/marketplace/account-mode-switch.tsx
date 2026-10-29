"use client";

import { useNavigate } from "@tanstack/react-router";
import { Store, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { canUseBusinessMode, profileActiveMode } from "@/lib/account-mode";
import { setActiveMode } from "@/services/marketplace-service";
import { cn } from "@/lib/utils";

export function AccountModeSwitch({ className }: { className?: string }) {
  const { profile, refreshProfile, session } = useAuth();
  const navigate = useNavigate();
  if (!session || !profile) return null;

  const active = profileActiveMode(profile);
  const hasBusiness = canUseBusinessMode(profile);

  async function switchTo(mode: "customer" | "business") {
    if (mode === "business" && !hasBusiness) {
      void navigate({ to: "/shop/business-apply" });
      toast.message("Fill your business details — admin approval is required first.");
      return;
    }
    const { error } = await setActiveMode(profile!.id, mode);
    if (error) {
      toast.error(error);
      return;
    }
    await refreshProfile();
    toast.success(mode === "customer" ? "Switched to Shop" : "Switched to Business");
    void navigate({ to: mode === "customer" ? "/shop" : "/app" });
  }

  return (
    <div className={cn("inline-flex rounded-full border border-border bg-muted/40 p-0.5", className)}>
      <Button
        type="button"
        size="sm"
        variant={active === "customer" ? "default" : "ghost"}
        className="h-8 rounded-full px-2.5 text-xs font-bold"
        onClick={() => void switchTo("customer")}
      >
        <ShoppingBag className="mr-1 size-3.5" /> Shop
      </Button>
      <Button
        type="button"
        size="sm"
        variant={active === "business" ? "default" : "ghost"}
        className="h-8 rounded-full px-2.5 text-xs font-bold"
        onClick={() => void switchTo("business")}
      >
        <Store className="mr-1 size-3.5" /> Business
      </Button>
    </div>
  );
}
