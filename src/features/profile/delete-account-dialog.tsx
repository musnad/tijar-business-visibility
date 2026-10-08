"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteOwnAccount } from "@/features/auth/auth-service";
import { useTranslation } from "@/lib/i18n/context";

export function DeleteAccountDialog() {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const token = t("app.profile.settings.deleteConfirmWord");
  const canDelete = confirmText.trim().toUpperCase() === token.toUpperCase();

  async function onDelete() {
    if (!canDelete) return;
    setDeleting(true);
    const { error } = await deleteOwnAccount();
    setDeleting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("app.profile.settings.accountDeleted"));
    window.location.assign("/");
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" className="min-h-11 w-full rounded-xl font-bold">
          {t("app.profile.settings.deleteAccount")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[min(100%,22rem)]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("app.profile.settings.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("app.profile.settings.deleteBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-xs text-muted-foreground">
          {t("app.profile.settings.deleteTypeHint").replace("{word}", token)}
        </p>
        <Input
          className="min-h-11 rounded-xl"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={token}
          autoComplete="off"
        />
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="rounded-xl">{t("app.common.back")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete || deleting}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void onDelete();
            }}
          >
            {t("app.profile.settings.deleteForever")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
