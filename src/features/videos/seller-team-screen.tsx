"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { useAuth } from "@/features/auth/auth-context";
import { hasCapability } from "@/lib/business/capabilities";
import { fetchBusinessMembers, fetchMyMembership, inviteBusinessStaff } from "@/services/business-service";

export function SellerTeamScreen({ businessId }: { businessId: string }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const mine = useQuery({
    queryKey: ["my-membership", businessId, profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: () => fetchMyMembership(businessId, profile!.id),
  });
  const members = useQuery({
    queryKey: ["business-members", businessId],
    queryFn: async () => {
      const r = await fetchBusinessMembers(businessId);
      if (r.error) throw new Error(r.error);
      return r.members;
    },
  });

  const canInvite = hasCapability(mine.data?.role, mine.data?.permissions, "manage_staff");

  return (
    <>
      <AppPageHeader
        title="Staff"
        subtitle="Owners and authorised staff for this business. RLS blocks other shops."
      />
      {canInvite && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await inviteBusinessStaff(businessId, email);
            if (r.error) toast.error(r.error);
            else {
              toast.success("Staff added");
              setEmail("");
              await queryClient.invalidateQueries({ queryKey: ["business-members", businessId] });
            }
          }}
        >
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Staff email already on TIJAR"
            className="min-h-11 rounded-xl"
          />
          <Button className="rounded-xl">Invite</Button>
        </form>
      )}
      {!canInvite && <p className="mt-3 text-xs text-muted-foreground">Only owners can add staff.</p>}
      <ul className="mt-4 space-y-2">
        {(members.data ?? []).map((m) => (
          <li key={m.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="font-bold">{m.full_name || m.email || m.profile_id}</p>
            <p className="text-xs capitalize text-muted-foreground">{m.role}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
