import type { QueryClient } from "@tanstack/react-query";

/** Refresh lists after customers, sales, expenses, or transactions change. */
export async function invalidateBusinessQueries(
  queryClient: QueryClient,
  businessId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["customers-dashboard", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["customer-activity", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["sales-dashboard", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["expense-dashboard", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["recent-transactions", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["period-analytics", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["business-health", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["products-dashboard", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["marketplace-products"] }),
    queryClient.invalidateQueries({ queryKey: ["marketplace-products-browse"] }),
    queryClient.invalidateQueries({ queryKey: ["marketplace-shops"] }),
    queryClient.invalidateQueries({ queryKey: ["storefront"] }),
    queryClient.invalidateQueries({ queryKey: ["create-products", businessId] }),
    queryClient.invalidateQueries({ queryKey: ["for-you-listings"] }),
    queryClient.invalidateQueries({ queryKey: ["learn-mission"] }),
  ]);
}
