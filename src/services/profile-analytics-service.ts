import { fetchBusinessHealthDashboard } from "@/services/business-health-service";
import { listProducts } from "@/services/product-service";
import { fetchPeriodAnalytics } from "@/services/transaction-service";

export type ProfileDashboardStats = {
  productCount: number;
  totalSales: number;
  ratingDisplay: string | null;
  joinedAt: string;
};

export async function fetchProfileDashboard(
  businessId: string,
  profileCreatedAt: string,
  t: (key: string) => string,
): Promise<{ data: ProfileDashboardStats | null; error: string | null }> {
  const [productsRes, analyticsRes, healthRes] = await Promise.all([
    listProducts(businessId),
    fetchPeriodAnalytics(businessId, 365),
    fetchBusinessHealthDashboard(businessId, 30, t),
  ]);

  if (productsRes.error) return { data: null, error: productsRes.error };
  if (analyticsRes.error) return { data: null, error: analyticsRes.error };
  if (healthRes.error) return { data: null, error: healthRes.error };

  const healthScore = healthRes.data?.healthScore;
  const ratingDisplay =
    healthScore != null ? (healthScore / 20).toFixed(1) : null;

  return {
    data: {
      productCount: productsRes.data.length,
      totalSales: analyticsRes.current.sales,
      ratingDisplay,
      joinedAt: profileCreatedAt,
    },
    error: null,
  };
}
