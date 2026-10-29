"use client";

import { Link } from "@tanstack/react-router";

import { useTranslation } from "@/lib/i18n/context";

export function SupabaseSetupNotice() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-primary/40 bg-accent p-6 text-center shadow-sm">
      <h2 className="text-lg font-bold text-foreground">{t("app.login.supabaseNotConfigured")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("auth.deployEnvHint")}</p>
      <ul className="mt-4 space-y-1 text-left text-xs text-muted-foreground">
        <li>• VITE_SUPABASE_URL</li>
        <li>• VITE_SUPABASE_ANON_KEY</li>
        <li>• VITE_PUBLIC_APP_URL (production site URL)</li>
      </ul>
      <p className="mt-4 text-sm">
        <Link to="/api/supabase-health" className="font-semibold text-primary underline-offset-2 hover:underline">
          {t("auth.checkHealthLink")}
        </Link>
      </p>
    </div>
  );
}
