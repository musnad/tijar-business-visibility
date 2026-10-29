"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { isTijarSuperAdminEmail } from "@/lib/admin";
import { useTranslation } from "@/lib/i18n/context";
import {
  fetchListingsForModeration,
  fetchMyPlatformRoles,
  setListingModeration,
} from "@/services/discover-service";
import { detectDuplicates, isListingVisible, listingCompleteness } from "@/utils/discover";

export function ModerationScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const moderationStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return t("app.moderation.statusPending");
      case "approved":
        return t("app.moderation.statusApproved");
      case "flagged":
        return t("app.moderation.statusFlagged");
      case "suspended":
        return t("app.moderation.statusSuspended");
      default:
        return status;
    }
  };

  const verificationStatusLabel = (status: string) => {
    switch (status) {
      case "not_started":
        return t("app.moderation.verificationNotStarted");
      case "in_progress":
        return t("app.moderation.verificationInProgress");
      case "submitted":
        return t("app.moderation.verificationSubmitted");
      case "under_review":
        return t("app.moderation.verificationUnderReview");
      case "verified":
        return t("app.moderation.verificationVerified");
      case "rejected":
        return t("app.moderation.verificationRejected");
      case "requires_update":
        return t("app.moderation.verificationRequiresUpdate");
      default:
        return status;
    }
  };

  const missingLabel = (label: string) => {
    const labels: Record<string, string> = {
      "business name": t("app.moderation.missingBusinessName"),
      description: t("app.moderation.missingDescription"),
      "storefront URL": t("app.moderation.missingStorefrontUrl"),
      "map location": t("app.moderation.missingMapLocation"),
      "public location approval": t("app.moderation.missingLocationApproval"),
      "contact phone or WhatsApp": t("app.moderation.missingContact"),
      logo: t("app.moderation.missingLogo"),
      "at least one product or service": t("app.moderation.missingProductOrService"),
    };
    return labels[label] ?? label;
  };

  const duplicateLabel = (detail: string) =>
    detail
      .replace("same name within 250 m", t("app.moderation.duplicateSameNameNearby"))
      .replace("same public phone", t("app.moderation.duplicateSamePhone"));

  const rolesQuery = useQuery({
    queryKey: ["platform-roles", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchMyPlatformRoles(profile!.id),
  });
  const isAdmin =
    isTijarSuperAdminEmail(profile?.email) || (rolesQuery.data ?? []).includes("admin");

  const listingsQuery = useQuery({
    queryKey: ["moderation-listings"],
    enabled: isAdmin,
    queryFn: async () => {
      const r = await fetchListingsForModeration();
      if (r.error) throw new Error(r.error);
      return r.data;
    },
  });

  const duplicates = useMemo(
    () => detectDuplicates(listingsQuery.data ?? []),
    [listingsQuery.data],
  );

  async function setStatus(id: string, status: "approved" | "flagged" | "suspended" | "pending") {
    const { error } = await setListingModeration(id, status);
    if (error) toast.error(error);
    else {
      toast.success(t("app.moderation.listingUpdated").replace("{status}", moderationStatusLabel(status)));
      void queryClient.invalidateQueries({ queryKey: ["moderation-listings"] });
    }
  }

  if (rolesQuery.isLoading) return <p className="mt-8 text-muted-foreground">{t("app.moderation.checkingAccess")}</p>;
  if (!isAdmin) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 font-bold">{t("app.moderation.adminsOnly")}</p>
        <p className="text-sm text-muted-foreground">{t("app.moderation.adminsOnlyDescription")}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {listingsQuery.isLoading && <p className="text-muted-foreground">{t("app.moderation.loadingListings")}</p>}
      {(listingsQuery.data ?? []).map((b) => {
        const completeness = listingCompleteness({
          business_name: b.business_name, description: b.description, public_slug: b.public_slug,
          latitude: b.latitude, longitude: b.longitude, location_approved: b.location_approved,
          public_phone: b.public_phone, public_whatsapp: b.public_whatsapp, logo_url: b.logo_url,
        });
        const dupes = duplicates.get(b.id) ?? [];
        return (
          <article key={b.id} className="rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">{b.business_name}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{moderationStatusLabel(b.moderation_status)}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{b.is_published ? t("app.moderation.published") : t("app.moderation.unpublished")}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{isListingVisible(b) ? t("app.moderation.visible") : t("app.moderation.hidden")}</span>
              <span className="text-xs text-muted-foreground">{t("app.moderation.percentComplete").replace("{score}", String(completeness.score))}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              /b/{b.public_slug ?? "—"} · {b.public_location_label ?? b.location ?? t("app.moderation.noArea")} · {verificationStatusLabel(b.verification_status)}
            </p>
            {completeness.missing.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">{t("app.moderation.incomplete").replace("{missing}", completeness.missing.map(missingLabel).join(", "))}</p>
            )}
            {dupes.length > 0 && (
              <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" /> {t("app.moderation.possibleDuplicate").replace("{details}", dupes.map(duplicateLabel).join("; "))}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="rounded-xl" onClick={() => setStatus(b.id, "approved")}>{t("app.moderation.approve")}</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setStatus(b.id, "flagged")}>{t("app.moderation.flag")}</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setStatus(b.id, "suspended")}>{t("app.moderation.suspend")}</Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setStatus(b.id, "pending")}>{t("app.moderation.backToPending")}</Button>
            </div>
          </article>
        );
      })}
      {listingsQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">{t("app.moderation.noBusinesses")}</p>}
    </div>
  );
}
