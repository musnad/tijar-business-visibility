"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  Building2,
  ClipboardList,
  CreditCard,
  Search,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { TIJAR_SUPER_ADMIN_EMAIL, isTijarSuperAdminEmail } from "@/lib/admin";
import { cn } from "@/lib/utils";
import {
  fetchAdminBusinesses,
  fetchAdminOrders,
  fetchAdminPayments,
  fetchAdminProfiles,
  fetchAdminTransactions,
  fetchAdminUpgradeRequests,
  reviewBusinessUpgrade,
  setBusinessPublished,
  setBusinessVerification,
  shopName,
  type AdminOrder,
  type AdminTransaction,
  type KycStatus,
} from "@/services/admin-service";
import { fetchMyPlatformRoles, setListingModeration } from "@/services/discover-service";
import type { Business, Profile } from "@/types/database";
import { formatNgn, formatNgnCompact } from "@/utils/money";

type Tab =
  | "overview"
  | "kyc"
  | "applications"
  | "businesses"
  | "users"
  | "transactions"
  | "orders";

const KYC_QUEUE: KycStatus[] = ["submitted", "under_review", "in_progress", "requires_update"];

const engagementConfig = {
  events: { label: "Activity", color: "hsl(160 45% 42%)" },
  sales: { label: "Sales", color: "hsl(210 55% 42%)" },
};

function dayKey(iso?: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function lastDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function matchesQuery(haystack: string, q: string): boolean {
  if (!q) return true;
  return haystack.toLowerCase().includes(q.toLowerCase());
}

function StatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "ok" | "warn" | "bad" | "info" | "muted";
}) {
  const cls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-50 text-amber-800"
        : tone === "bad"
          ? "bg-destructive/10 text-destructive"
          : tone === "info"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", cls)}>
      {label.replaceAll("_", " ")}
    </span>
  );
}

function kycTone(status: string): "ok" | "warn" | "bad" | "info" | "muted" {
  if (status === "verified") return "ok";
  if (status === "rejected") return "bad";
  if (status === "submitted" || status === "under_review") return "warn";
  if (status === "requires_update" || status === "in_progress") return "info";
  return "muted";
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function AdminConsoleScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const rolesQuery = useQuery({
    queryKey: ["platform-roles", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchMyPlatformRoles(profile!.id),
  });

  const isAdmin =
    isTijarSuperAdminEmail(profile?.email) || (rolesQuery.data ?? []).includes("admin");

  const businessesQuery = useQuery({
    queryKey: ["admin-businesses"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchAdminBusinesses();
      if (r.error) throw new Error(r.error);
      return r.businesses;
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

  const txQuery = useQuery({
    queryKey: ["admin-transactions"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchAdminTransactions();
      if (r.error) throw new Error(r.error);
      return r.transactions;
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ["admin-payments"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchAdminPayments();
      if (r.error) throw new Error(r.error);
      return r.payments;
    },
  });

  const businesses = businessesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const transactions = txQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const upgrades = upgradesQuery.data ?? [];

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const sales = transactions.filter((t) => t.type === "sale");
    const salesToday = sales.filter((t) => dayKey(t.occurred_at) === today);
    const ordersToday = orders.filter((o) => dayKey(o.created_at) === today);
    const newUsersToday = users.filter((u) => dayKey(u.created_at) === today);
    return {
      users: users.length,
      businesses: businesses.length,
      verified: businesses.filter((b) => b.verification_status === "verified").length,
      pendingKyc: businesses.filter((b) => KYC_QUEUE.includes(b.verification_status as KycStatus)).length,
      pendingApps: upgrades.filter((r) => r.status === "pending").length,
      transactions: transactions.length,
      salesVolume: sales.reduce((n, t) => n + Number(t.amount), 0),
      salesToday: salesToday.reduce((n, t) => n + Number(t.amount), 0),
      orders: orders.length,
      ordersToday: ordersToday.length,
      gmv: orders.reduce((n, o) => n + Number(o.total), 0),
      payments: payments.reduce((n, p) => n + Number(p.amount), 0),
      newUsersToday: newUsersToday.length,
      activeShopsToday: new Set(
        [
          ...salesToday.map((t) => t.business_id),
          ...ordersToday.map((o) => o.business_id),
        ].filter(Boolean),
      ).size,
    };
  }, [businesses, users, orders, transactions, payments, upgrades]);

  const engagement = useMemo(() => {
    const days = lastDays(14);
    return days.map((day) => {
      const label = day.slice(8, 10);
      const tx = transactions.filter((t) => dayKey(t.occurred_at) === day);
      const dayOrders = orders.filter((o) => dayKey(o.created_at) === day);
      const dayUsers = users.filter((u) => dayKey(u.created_at) === day);
      const dayShops = businesses.filter((b) => dayKey(b.created_at) === day);
      const sales = tx.filter((t) => t.type === "sale").reduce((n, t) => n + Number(t.amount), 0);
      return {
        day,
        label,
        events: tx.length + dayOrders.length + dayUsers.length + dayShops.length,
        sales,
        transactions: tx.length,
        orders: dayOrders.length,
        users: dayUsers.length,
        shops: dayShops.length,
      };
    });
  }, [transactions, orders, users, businesses]);

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-upgrades"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] }),
      queryClient.invalidateQueries({ queryKey: ["moderation-listings"] }),
    ]);
  }

  function noteFor(id: string): string {
    return notesById[id] ?? "";
  }

  if (rolesQuery.isLoading && !isTijarSuperAdminEmail(profile?.email)) {
    return <p className="mt-8 text-muted-foreground">Checking admin access…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 font-bold">Admins only</p>
        <p className="text-sm text-muted-foreground">Sign in as {TIJAR_SUPER_ADMIN_EMAIL}.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "kyc", label: "KYC" },
    { id: "applications", label: "Applications" },
    { id: "businesses", label: "Businesses" },
    { id: "users", label: "Users" },
    { id: "transactions", label: "Transactions" },
    { id: "orders", label: "Orders" },
  ];

  const q = query.trim();
  const kycRows = businesses.filter((b) =>
    matchesQuery(
      [b.business_name, b.public_phone, b.location, b.verification_status, b.moderation_status].join(" "),
      q,
    ),
  );
  const kycQueue = kycRows.filter((b) => KYC_QUEUE.includes(b.verification_status as KycStatus));
  const userRows = users.filter((u) =>
    matchesQuery([u.full_name, u.email, u.phone, u.account_mode].join(" "), q),
  );
  const bizRows = businesses.filter((b) =>
    matchesQuery([b.business_name, b.public_phone, b.location, b.public_slug].join(" "), q),
  );
  const txRows = transactions.filter((t) =>
    matchesQuery([shopName(t), t.type, t.description, t.payment_method].join(" "), q),
  );
  const orderRows = orders.filter((o) =>
    matchesQuery(
      [o.order_number, shopName(o), o.status, o.buyer?.full_name, o.buyer?.email, o.buyer_phone].join(" "),
      q,
    ),
  );

  return (
    <div className="pb-8">
      <section className="overflow-hidden rounded-[1.35rem] border border-primary/15 bg-[linear-gradient(135deg,oklch(0.27_0.05_210),oklch(0.36_0.07_175))] p-5 text-white shadow-lg lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">TIJAR operations</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight lg:text-3xl">Admin console</h1>
            <p className="mt-1 text-sm text-white/85">{profile?.email ?? TIJAR_SUPER_ADMIN_EMAIL}</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
            Super admin
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Kpi icon={Users} label="Users" value={String(stats.users)} hint={`${stats.newUsersToday} today`} />
          <Kpi icon={Store} label="Businesses" value={String(stats.businesses)} hint={`${stats.verified} KYC verified`} />
          <Kpi icon={BadgeCheck} label="KYC queue" value={String(stats.pendingKyc)} hint={`${stats.pendingApps} applications`} />
          <Kpi icon={Wallet} label="Sales (ledger)" value={formatNgnCompact(stats.salesVolume)} hint={`${formatNgnCompact(stats.salesToday)} today`} />
          <Kpi icon={Building2} label="Marketplace GMV" value={formatNgnCompact(stats.gmv)} hint={`${stats.ordersToday} orders today`} />
          <Kpi icon={CreditCard} label="Active shops today" value={String(stats.activeShopsToday)} hint={`${stats.transactions} tx tracked`} />
        </div>
      </section>

      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setQuery("");
            }}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold",
              tab === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {item.label}
            {item.id === "kyc" && stats.pendingKyc > 0 ? ` (${stats.pendingKyc})` : ""}
            {item.id === "applications" && stats.pendingApps > 0 ? ` (${stats.pendingApps})` : ""}
          </button>
        ))}
      </div>

      {tab !== "overview" && (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}…`}
            className="h-11 rounded-2xl pl-9"
          />
        </div>
      )}

      {tab === "overview" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">Daily engagement</h2>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Last 14 days</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Users joining, shops opening, ledger entries, and marketplace orders.
            </p>
            <ChartContainer config={engagementConfig} className="mt-3 h-[220px] w-full aspect-auto">
              <BarChart data={engagement} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="events" fill="var(--color-events)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
            <h2 className="font-extrabold">Sales volume</h2>
            <p className="mt-1 text-xs text-muted-foreground">Recorded business sales across the platform.</p>
            <ChartContainer config={engagementConfig} className="mt-3 h-[220px] w-full aspect-auto">
              <AreaChart data={engagement} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatNgnCompact(Number(v))} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="sales" stroke="var(--color-sales)" fill="var(--color-sales)" fillOpacity={0.18} />
              </AreaChart>
            </ChartContainer>
          </div>
          <Link to="/app/admin/moderation" className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-1">
            <ClipboardList className="size-5 text-primary" />
            <p className="mt-2 font-extrabold">Listing moderation</p>
            <p className="mt-1 text-sm text-muted-foreground">Flag or suspend public shops.</p>
          </Link>
          <Link to="/app/admin/translate" className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-1">
            <ShieldCheck className="size-5 text-primary" />
            <p className="mt-2 font-extrabold">Translations</p>
            <p className="mt-1 text-sm text-muted-foreground">System copy and language coverage.</p>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-3">
            <h2 className="font-extrabold">Needs attention</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between gap-3">
                <span>KYC waiting review</span>
                <button type="button" className="font-bold text-primary" onClick={() => setTab("kyc")}>
                  {stats.pendingKyc}
                </button>
              </li>
              <li className="flex justify-between gap-3">
                <span>Business applications</span>
                <button type="button" className="font-bold text-primary" onClick={() => setTab("applications")}>
                  {stats.pendingApps}
                </button>
              </li>
              <li className="flex justify-between gap-3">
                <span>Marketplace orders</span>
                <button type="button" className="font-bold text-primary" onClick={() => setTab("orders")}>
                  {stats.orders}
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      {tab === "kyc" && (
        <section className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Approve business identity (KYC). Queue first, then every shop.
          </p>
          {kycQueue.length === 0 && q === "" && (
            <EmptyState title="No KYC waiting" body="Submitted and in-review businesses will appear here." />
          )}
          {(q ? kycRows : kycQueue.length ? kycQueue : kycRows).map((biz) => (
            <KycCard
              key={biz.id}
              biz={biz}
              notes={noteFor(biz.id)}
              onNotes={(value) => setNotesById((prev) => ({ ...prev, [biz.id]: value }))}
              onAction={async (status) => {
                const { error } = await setBusinessVerification(biz.id, status, noteFor(biz.id));
                if (error) toast.error(error);
                else {
                  toast.success(status === "verified" ? "KYC approved" : `KYC set to ${status.replaceAll("_", " ")}`);
                  void refreshAll();
                }
              }}
            />
          ))}
        </section>
      )}

      {tab === "applications" && (
        <ul className="mt-4 space-y-3">
          {upgrades.filter((r) => matchesQuery([r.business_name, r.phone, r.city, r.status].join(" "), q)).length === 0 && (
            <EmptyState title="No applications" body="Customer requests to open a business account land here." />
          )}
          {upgrades
            .filter((r) => matchesQuery([r.business_name, r.phone, r.city, r.status].join(" "), q))
            .map((req) => (
              <li key={req.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold">{req.business_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[req.street, req.city, req.state].filter(Boolean).join(", ")} · {req.phone}
                    </p>
                    {req.description ? <p className="mt-2 text-sm">{req.description}</p> : null}
                  </div>
                  <StatusPill
                    label={req.status}
                    tone={req.status === "approved" ? "ok" : req.status === "rejected" ? "bad" : "warn"}
                  />
                </div>
                {req.status === "pending" && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={noteFor(req.id)}
                      onChange={(e) => setNotesById((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Review notes"
                      className="h-10 rounded-xl"
                    />
                    <Button
                      className="rounded-xl font-bold"
                      onClick={async () => {
                        const { error } = await reviewBusinessUpgrade(req.id, true, noteFor(req.id));
                        if (error) toast.error(error);
                        else {
                          toast.success("Business account approved");
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
                        const { error } = await reviewBusinessUpgrade(req.id, false, noteFor(req.id));
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

      {tab === "businesses" && (
        <AdminTable
          empty="No businesses yet."
          headers={["Business", "Contact", "KYC", "Listing", "Published"]}
        >
          {bizRows.map((biz) => (
            <tr key={biz.id} className="border-t border-border align-top">
              <td className="px-3 py-3">
                <p className="font-semibold">{biz.business_name}</p>
                <p className="text-[11px] text-muted-foreground">{biz.public_location_label ?? biz.location ?? "—"}</p>
              </td>
              <td className="px-3 py-3 text-sm text-muted-foreground">{biz.public_phone ?? "—"}</td>
              <td className="px-3 py-3">
                <StatusPill label={biz.verification_status} tone={kycTone(biz.verification_status)} />
              </td>
              <td className="px-3 py-3">
                <StatusPill
                  label={biz.moderation_status}
                  tone={biz.moderation_status === "approved" ? "ok" : biz.moderation_status === "suspended" ? "bad" : "warn"}
                />
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs"
                    onClick={async () => {
                      const { error } = await setBusinessPublished(biz.id, !biz.is_published);
                      if (error) toast.error(error);
                      else {
                        toast.success(biz.is_published ? "Unpublished" : "Published");
                        void refreshAll();
                      }
                    }}
                  >
                    {biz.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs"
                    onClick={async () => {
                      const next = biz.moderation_status === "approved" ? "suspended" : "approved";
                      const { error } = await setListingModeration(biz.id, next);
                      if (error) toast.error(error);
                      else {
                        toast.success(next === "approved" ? "Listing live" : "Listing suspended");
                        void refreshAll();
                      }
                    }}
                  >
                    {biz.moderation_status === "approved" ? "Suspend" : "Approve listing"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      {tab === "users" && (
        <AdminTable empty="No users yet." headers={["Name", "Email", "Phone", "Mode", "Onboarding", "Joined"]}>
          {userRows.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </AdminTable>
      )}

      {tab === "transactions" && (
        <AdminTable empty="No ledger transactions yet." headers={["When", "Shop", "Type", "Amount", "Method", "Note"]}>
          {txRows.map((tx) => (
            <TxRow key={tx.id} tx={tx} />
          ))}
        </AdminTable>
      )}

      {tab === "orders" && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Marketplace checkout · {payments.length} payment records · {formatNgn(stats.payments)} captured/initiated
          </p>
          <AdminTable empty="No marketplace orders yet." headers={["Order", "Buyer", "Shop", "Status", "Total", "When"]}>
            {orderRows.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </AdminTable>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-white/12 px-3 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-white/80">
        <Icon className="size-3.5" />
        <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 text-lg font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium text-white/70">{hint}</p>
    </div>
  );
}

function AdminTable({
  headers,
  empty,
  children,
}: {
  headers: string[];
  empty: string;
  children: ReactNode;
}) {
  const rows = Array.isArray(children) ? children : [children];
  if (rows.filter(Boolean).length === 0) {
    return (
      <div className="mt-4">
        <EmptyState title={empty} body="New activity will show here automatically." />
      </div>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function UserRow({ user }: { user: Profile }) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2.5 font-semibold">{user.full_name || "—"}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{user.email ?? "—"}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{user.phone ?? "—"}</td>
      <td className="px-3 py-2.5 capitalize">{user.account_mode ?? "business"}</td>
      <td className="px-3 py-2.5">{user.onboarding_status}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{formatWhen(user.created_at)}</td>
    </tr>
  );
}

function TxRow({ tx }: { tx: AdminTransaction }) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2.5 text-muted-foreground">{formatWhen(tx.occurred_at)}</td>
      <td className="px-3 py-2.5 font-semibold">{shopName(tx)}</td>
      <td className="px-3 py-2.5 capitalize">{tx.type.replaceAll("_", " ")}</td>
      <td className="px-3 py-2.5 font-extrabold tabular-nums">{formatNgn(Number(tx.amount))}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{tx.payment_method ?? "—"}</td>
      <td className="max-w-[220px] truncate px-3 py-2.5 text-muted-foreground">{tx.description ?? "—"}</td>
    </tr>
  );
}

function OrderRow({ order }: { order: AdminOrder }) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2.5 font-semibold">{order.order_number}</td>
      <td className="px-3 py-2.5">
        <p>{order.buyer?.full_name ?? "Buyer"}</p>
        <p className="text-[11px] text-muted-foreground">{order.buyer?.email ?? order.buyer_phone ?? "—"}</p>
      </td>
      <td className="px-3 py-2.5">{shopName(order)}</td>
      <td className="px-3 py-2.5">
        <StatusPill label={order.status} tone={order.status.includes("cancel") ? "bad" : "info"} />
      </td>
      <td className="px-3 py-2.5 font-extrabold tabular-nums">{formatNgn(Number(order.total))}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{formatWhen(order.created_at)}</td>
    </tr>
  );
}

function KycCard({
  biz,
  notes,
  onNotes,
  onAction,
}: {
  biz: Business;
  notes: string;
  onNotes: (value: string) => void;
  onAction: (status: KycStatus) => Promise<void>;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold">{biz.business_name}</p>
          <p className="text-xs text-muted-foreground">
            {biz.public_phone ?? "No phone"} · {biz.public_location_label ?? biz.location ?? "No location"}
          </p>
          {biz.description ? <p className="mt-2 line-clamp-2 text-sm">{biz.description}</p> : null}
          {biz.moderation_notes ? (
            <p className="mt-2 text-xs text-muted-foreground">Notes: {biz.moderation_notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <StatusPill label={biz.verification_status} tone={kycTone(biz.verification_status)} />
          <StatusPill
            label={biz.moderation_status}
            tone={biz.moderation_status === "approved" ? "ok" : "muted"}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 lg:flex-row">
        <Input
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="KYC review notes"
          className="h-10 rounded-xl"
        />
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl font-bold" onClick={() => void onAction("verified")}>
            Approve KYC
          </Button>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => void onAction("under_review")}>
            Under review
          </Button>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => void onAction("requires_update")}>
            Request update
          </Button>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => void onAction("rejected")}>
            Reject
          </Button>
        </div>
      </div>
    </article>
  );
}
