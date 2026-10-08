import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { StockAdjustForm } from "@/features/products/stock-adjust-form";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";
import { getProduct } from "@/services/product-service";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/app/products/adjust")({
  validateSearch: (search: Record<string, unknown>) => ({
    productId:
      typeof search.productId === "string" && search.productId.length > 0
        ? search.productId
        : undefined,
  }),
  component: AdjustStockPage,
});

function AdjustStockPage() {
  return (
    <RequireAuth>
      <AdjustStockPageContent />
    </RequireAuth>
  );
}

function AdjustStockPageContent() {
  const { t } = useTranslation();
  const { productId } = Route.useSearch();
  const { profile } = useAuth();
  const { data, isLoading: bizLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;

  const { data: product, isLoading: prodLoading } = useQuery({
    queryKey: ["product", productId],
    enabled: Boolean(productId),
    queryFn: async () => {
      const result = await getProduct(productId!);
      if (result.error) throw new Error(result.error);
      if (!result.product) throw new Error("Product not found");
      return result.product;
    },
  });

  return (
    <AppShell>
      <AppPageHeader
        title={t("app.products.adjustTitle")}
        subtitle={t("app.products.adjustSubtitle")}
        action={<BackLinkButton to="/app/products" label={t("app.common.back")} />}
      />
      {(bizLoading || prodLoading) && <p className="mt-8 text-muted-foreground">…</p>}
      {!productId && (
        <p className="mt-8 text-sm text-destructive">{t("app.products.pickProduct")}</p>
      )}
      {business && profile?.id && product && (
        <StockAdjustForm businessId={business.id} profileId={profile.id} product={product} />
      )}
    </AppShell>
  );
}
