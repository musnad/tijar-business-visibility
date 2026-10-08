import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { RequireAuth } from "@/features/app/require-auth";
import { NewCustomerPaymentForm } from "@/features/customers/new-customer-payment-form";
import { NewExpenseForm } from "@/features/expenses/new-expense-form";
import { NewSaleForm } from "@/features/sales/new-sale-form";
import { TRANSACTION_TYPES, type TransactionType } from "@/features/transactions/constants";
import { RecordForm } from "@/features/transactions/record-form";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/record")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search.type;
    const customerId =
      typeof search.customerId === "string" && search.customerId.length > 0
        ? search.customerId
        : undefined;
    if (typeof raw === "string" && (TRANSACTION_TYPES as readonly string[]).includes(raw)) {
      return { type: raw as TransactionType, customerId };
    }
    return { type: undefined, customerId };
  },
  component: RecordPage,
});

function RecordPage() {
  return (
    <RequireAuth>
      <RecordPageContent />
    </RequireAuth>
  );
}

function RecordPageContent() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { type, customerId } = Route.useSearch();
  const { data, isLoading } = usePrimaryBusiness(profile?.id);
  const business = data?.business;
  const isSale = !type || type === "sale";
  const isExpense = type === "expense";
  const isCustomerPayment = type === "customer_payment";

  const backTo = isSale
    ? "/app/sales"
    : isExpense
      ? "/app/expenses"
      : isCustomerPayment
        ? "/app/customers"
        : "/app/transactions";

  const title = isSale
    ? t("app.sales.newSaleTitle")
    : isExpense
      ? t("app.expenses.newExpenseTitle")
      : isCustomerPayment
        ? t("app.customers.paymentTitle")
        : t("app.record.title");

  const subtitle = isSale
    ? t("app.sales.newSaleSubtitle")
    : isExpense
      ? t("app.expenses.newExpenseSubtitle")
      : isCustomerPayment
        ? t("app.customers.paymentSubtitle")
        : t("app.record.subtitle");

  return (
    <AppShell>
      <AppPageHeader
        title={title}
        subtitle={subtitle}
        action={<BackLinkButton to={backTo} label={t("app.common.back")} />}
      />

      {isLoading && <p className="mt-8 text-muted-foreground">…</p>}
      {!isLoading && !business && (
        <p className="mt-8 text-sm text-destructive">{t("app.errors.noBusiness")}</p>
      )}
      {business && profile?.id && isSale && (
        <NewSaleForm businessId={business.id} profileId={profile.id} />
      )}
      {business && profile?.id && isExpense && (
        <NewExpenseForm businessId={business.id} profileId={profile.id} />
      )}
      {business && profile?.id && isCustomerPayment && (
        <NewCustomerPaymentForm
          businessId={business.id}
          profileId={profile.id}
          initialCustomerId={customerId}
        />
      )}
      {business && profile?.id && !isSale && !isExpense && !isCustomerPayment && type && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <RecordForm
            businessId={business.id}
            profileId={profile.id}
            initialType={type}
          />
        </div>
      )}
    </AppShell>
  );
}
