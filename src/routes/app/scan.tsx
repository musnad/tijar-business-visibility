import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { RouteFallback } from "@/components/route-fallback";
import { useTranslation } from "@/lib/i18n/context";

const ScanDocumentScreen = lazy(() =>
  import("@/features/scan/scan-document-screen").then((m) => ({ default: m.ScanDocumentScreen })),
);

export const Route = createFileRoute("/app/scan")({
  component: ScanPage,
});

function ScanPage() {
  return (
    <RequireAuth>
      <ScanPageContent />
    </RequireAuth>
  );
}

function ScanPageContent() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.scan.title")}
        subtitle={t("app.scan.subtitle")}
        action={<BackLinkButton to="/app" label={t("app.common.back")} />}
      />
      <Suspense fallback={<RouteFallback />}>
        <ScanDocumentScreen />
      </Suspense>
    </AppShell>
  );
}
