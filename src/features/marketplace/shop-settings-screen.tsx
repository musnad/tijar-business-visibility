"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MarketplaceShell } from "@/features/marketplace/marketplace-shell";
import { AccountModeSwitch } from "@/features/marketplace/account-mode-switch";
import { AppLanguageButton } from "@/features/app-layout/app-language-button";
import { useAuth } from "@/features/auth/auth-context";
import { signOut } from "@/features/auth/auth-service";
import { canUseBusinessMode } from "@/lib/account-mode";
import { isTijarSuperAdminEmail } from "@/lib/admin";
import {
  fetchNotificationPreferences,
  saveNotificationPreferences,
} from "@/services/marketplace-service";
import type { NotificationPreferences } from "@/types/database";

export function ShopSettingsScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification-prefs", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const r = await fetchNotificationPreferences(profile!.id);
      if (r.error) throw new Error(r.error);
      return r.prefs;
    },
  });

  const save = useMutation({
    mutationFn: (prefs: NotificationPreferences) => saveNotificationPreferences(prefs),
    onSuccess: async () => {
      toast.success("Privacy settings saved");
      await queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const prefs = query.data;

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
        <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-[color:var(--brand-navy,#001B3A)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Language, privacy, and who can contact you. TIJAR does not sell your profile data.
        </p>

        {!session || !profile ? (
          <Button className="mt-6 min-h-11 w-full rounded-full font-bold" asChild>
            <Link to="/login">Sign in to manage settings</Link>
          </Button>
        ) : (
          <div className="mt-5 space-y-4">
            <section className="rounded-2xl border border-border p-4">
              <p className="text-sm font-extrabold">Language</p>
              <div className="mt-2">
                <AppLanguageButton />
              </div>
            </section>

            <section className="rounded-2xl border border-border p-4">
              <p className="text-sm font-extrabold">Account</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Shop or business mode</p>
                <AccountModeSwitch />
              </div>
              {canUseBusinessMode(profile) && (
                <Button variant="outline" className="mt-3 w-full rounded-xl font-bold" asChild>
                  <Link to="/app">Open business dashboard</Link>
                </Button>
              )}
              {isTijarSuperAdminEmail(profile.email) && (
                <Button variant="outline" className="mt-2 w-full rounded-xl font-bold" asChild>
                  <Link to="/app/admin">Admin console</Link>
                </Button>
              )}
            </section>

            <section className="rounded-2xl border border-border p-4">
              <p className="text-sm font-extrabold">Privacy</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You control alerts. Location is only used when you tap Near me. Chats stay between you and the shop.
              </p>
              {prefs && (
                <ul className="mt-3 space-y-3">
                  <PrivacyToggle
                    label="Order updates"
                    checked={prefs.order_updates}
                    onChange={(order_updates) => save.mutate({ ...prefs, order_updates })}
                  />
                  <PrivacyToggle
                    label="Shop replies"
                    checked={prefs.enquiry_replies}
                    onChange={(enquiry_replies) => save.mutate({ ...prefs, enquiry_replies })}
                  />
                  <PrivacyToggle
                    label="Shops I follow"
                    checked={prefs.followed_shops}
                    onChange={(followed_shops) => save.mutate({ ...prefs, followed_shops })}
                  />
                  <PrivacyToggle
                    label="Tips and offers"
                    checked={prefs.marketing}
                    onChange={(marketing) => save.mutate({ ...prefs, marketing })}
                  />
                </ul>
              )}
            </section>

            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full rounded-full font-bold"
              onClick={async () => {
                await signOut();
                await refreshProfile();
                void navigate({ to: "/shop" });
              }}
            >
              <LogOut className="mr-2 size-4" /> Log out
            </Button>
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}

function PrivacyToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
      {label}
      <input type="checkbox" className="size-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
