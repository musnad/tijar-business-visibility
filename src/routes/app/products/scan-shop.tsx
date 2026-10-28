import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { ScanShopScreen } from "@/features/products/scan-shop-screen";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/products/scan-shop")({
  component: ScanShopPage,
});

function ScanShopPage() {
  return (
    <RequireAuth>
      <ScanShopPageContent />
    </RequireAuth>
  );
}

function ScanShopPageContent() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.shopScan.title")}
        subtitle={t("app.shopScan.subtitle")}
        action={<BackLinkButton to="/app/products" label={t("app.common.back")} />}
      />
      <ScanShopScreen />
    </AppShell>
  );
}
