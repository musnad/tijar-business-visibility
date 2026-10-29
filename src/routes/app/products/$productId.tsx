import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { RequireAuth } from "@/features/app/require-auth";
import { EditProductForm } from "@/features/products/edit-product-form";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/products/$productId")({
  component: Page,
});

function Page() {
  return (
    <RequireAuth>
      <Content />
    </RequireAuth>
  );
}

function Content() {
  const { t } = useTranslation();
  const { productId } = Route.useParams();
  const { profile } = useAuth();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;
  return (
    <AppShell>
      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>}
      {business && <EditProductForm businessId={business.id} productId={productId} />}
    </AppShell>
  );
}
