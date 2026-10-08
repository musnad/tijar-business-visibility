import { listCustomers } from "@/services/customer-service";
import type { Customer } from "@/types/database";

export type CustomersDashboard = {
  customerCount: number;
  owingCount: number;
  totalOwed: number;
  onCredit: Customer[];
  paidUp: Customer[];
  allCustomers: Customer[];
  sparkline: number[];
};

export async function fetchCustomersDashboard(businessId: string): Promise<{
  data: CustomersDashboard | null;
  error: string | null;
}> {
  const { data: rows, error } = await listCustomers(businessId);
  if (error) return { data: null, error };

  const onCredit = rows
    .filter((c) => Number(c.balance_owed) > 0)
    .sort((a, b) => Number(b.balance_owed) - Number(a.balance_owed));

  const totalOwed = onCredit.reduce((sum, c) => sum + Number(c.balance_owed), 0);

  const sparkline =
    onCredit.length > 0
      ? onCredit.slice(0, 7).map((c) => Number(c.balance_owed)).reverse()
      : [0, 0];

  const paidUp = rows
    .filter((c) => Number(c.balance_owed) <= 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    data: {
      customerCount: rows.length,
      owingCount: onCredit.length,
      totalOwed,
      onCredit,
      paidUp,
      allCustomers: [...onCredit, ...paidUp],
      sparkline,
    },
    error: null,
  };
}
