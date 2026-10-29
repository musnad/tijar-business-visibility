"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  ClipboardList,
  ShieldCheck,
  Store,
  Users,
  Package,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { isTijarSuperAdminEmail } from "@/lib/admin";
import {
  fetchAdminOrders,
  fetchAdminProfiles,
  fetchAdminUpgradeRequests,
  reviewBusinessUpgrade,
  setBusinessVerification,
  summarizeAdmin,
} from "@/services/admin-service";
import {
  fetchListingsForModeration,
  fetchMyPlatformRoles,
  setListingModeration,
} from "@/services/discover-service";
import { formatNgn } from "@/utils/money";

type Tab = "overview" | "applications" | "listings" | "users" | "orders";

export function AdminConsoleScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [notes, setNotes] = useState("");

  const rolesQuery = useQuery({
    queryKey: ["platform-roles", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchMyPlatformRoles(profile!.id),
  });

  const isAdmin =
    isTijarSuperAdminEmail(profile?.email) || (rolesQuery.data ?? []).includes("admin");

  const listingsQuery = useQuery({
    queryKey: ["admin-listings"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchListingsForModeration();
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  const upgradesQuery = useQuery({
    queryKey: ["admin-upgrades"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchAdminUpgradeRequests();
      if (r.error) throw new Error(r.error);
      return r.requests;
    },
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchAdminProfiles();
      if (r.error) throw new Error(r.error);
      return r.profiles;
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchAdminOrders();
      if (r.error) throw new Error(r.error);
      return r.orders;
    },
  });

  const stats = useMemo(
    () =>
      summarizeAdmin(
        usersQuery.data ?? [],
        listingsQuery.data ?? [],
        upgradesQuery.data ?? [],
        ordersQuery.data ?? [],
      ),
    [usersQuery.data, listingsQuery.data, upgradesQuery.data, ordersQuery.data],
  );

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-upgrades"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["moderation-listings"] }),
    ]);
  }

  if (rolesQuery.isLoading && !isTijarSuperAdminEmail(profile?.email)) {
    return <p className="mt-8 text-muted-foreground">Checking admin access…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 font-bold">Admins only</p>
        <p className="text-sm text-muted-foreground">
          Sign in as musababubakar123@gmail.com to open the console.
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "applications", label: "Applications" },
    { id: "listings", label: "Listings" },
    { id: "users", label: "Users" },
    { id: "orders", label: "Orders" },
  ];

  return (
    <div className="pb-6">
      <section className="marketplace-hero overflow-hidden rounded-[1.35rem] p-5 text-primary-foreground shadow-lg">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/75">TIJAR control</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Admin console</h1>
        <p className="mt-1 text-sm text-white/85">{profile?.email}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Users", value: stats.users, icon: Users },
            { label: "Shops", value: stats.shops, icon: Store },
            { label: "Pending apps", value: stats.pendingUpgrades, icon: ClipboardList },
            { label: "Pending listings", value: stats.pendingListings, icon: BadgeCheck },
            { label: "Verified", value: stats.verified, icon: ShieldCheck },
            { label: "Orders", value: stats.orders, icon: Package },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/12 px-2 py-2.5 text-center backdrop-blur-sm">
              <item.icon className="mx-auto size-4 text-white/80" />
              <p className="mt-1 text-lg font-extrabold tabular-nums">{item.value}</p>
              <p className="text-[10px] font-semibold text-white/75">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${
              tab === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Link to="/app/admin/moderation" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-extrabold">Listing moderation</p>
            <p className="mt-1 text-sm text-muted-foreground">Approve, flag, or suspend public shops.</p>
          </Link>
          <Link to="/app/admin/translate" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-extrabold">System translation</p>
            <p className="mt-1 text-sm text-muted-foreground">Review and generate app copy.</p>
          </Link>
        </div>
      )}

      {tab === "applications" && (
        <ul className="mt-4 space-y-3">
          {(upgradesQuery.data ?? []).length === 0 && (
            <li className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No business applications yet.
            </li>
          )}
          {(upgradesQuery.data ?? []).map((req) => (
            <li key={req.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-extrabold">{req.business_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.city}
                    {req.state ? `, ${req.state}` : ""} · {req.phone}
                  </p>
                  <p className="mt-1 text-sm">{req.description}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">
                  {req.status}
                </span>
              </div>
              {req.status === "pending" && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
                  />
                  <Button
                    className="rounded-xl font-bold"
                    onClick={async () => {
                      const { error } = await reviewBusinessUpgrade(req.id, true, notes);
                      if (error) toast.error(error);
                      else {
                        toast.success("Business approved — they can switch Shop / Business now.");
                        setNotes("");
                        void refreshAll();
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl font-bold"
                    onClick={async () => {
                      const { error } = await reviewBusinessUpgrade(req.id, false, notes);
                      if (error) toast.error(error);
                      else {
                        toast.message("Application rejected");
                        void refreshAll();
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === "listings" && (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {(listingsQuery.data ?? []).map((biz) => (
            <li key={biz.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="font-extrabold">{biz.business_name}</p>
              <p className="text-xs text-muted-foreground">
                {biz.moderation_status} · {biz.verification_status}
                {biz.is_published ? " · published" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={async () => {
                    const { error } = await setListingModeration(biz.id, "approved");
                    if (error) toast.error(error);
                    else {
                      toast.success("Listing approved");
                      void refreshAll();
                    }
                  }}
                >
                  Approve listing
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={async () => {
                    const { error } = await setBusinessVerification(biz.id, "verified");
                    if (error) toast.error(error);
                    else {
                      toast.success("Marked verified");
                      void refreshAll();
                    }
                  }}
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={async () => {
                    const { error } = await setListingModeration(biz.id, "suspended");
                    if (error) toast.error(error);
                    else {
                      toast.message("Listing suspended");
                      void refreshAll();
                    }
                  }}
                >
                  Suspend
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "users" && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Onboarding</th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data ?? []).map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{user.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
                  <td className="px-3 py-2 capitalize">{user.account_mode ?? "business"}</td>
                  <td className="px-3 py-2">{user.onboarding_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orders" && (
        <ul className="mt-4 space-y-2">
          {(ordersQuery.data ?? []).map((order) => (
            <li key={order.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <div>
                <p className="font-bold">{order.order_number}</p>
                <p className="text-xs capitalize text-muted-foreground">{order.status}</p>
              </div>
              <p className="font-extrabold tabular-nums">{formatNgn(order.total)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
