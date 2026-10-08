import type { ParsedImportRow } from "@/features/records/parse-import-file";
import { PAYMENT_METHOD_IDS } from "@/features/transactions/constants";
import type { RecordTransactionInput } from "@/features/transactions/schemas";
import { createTransaction } from "@/services/transaction-service";

function normalizePayment(method?: string): RecordTransactionInput["paymentMethod"] | undefined {
  if (!method) return undefined;
  const m = method.trim().toLowerCase().replace(/\s+/g, "_");
  if ((PAYMENT_METHOD_IDS as readonly string[]).includes(m)) {
    return m as RecordTransactionInput["paymentMethod"];
  }
  if (m === "mobile_money" || m === "mobilemoney") return "mobile_money";
  return "other";
}

function defaultPayment(type: ParsedImportRow["type"]): RecordTransactionInput["paymentMethod"] {
  if (type === "customer_payment" || type === "supplier_payment") return "cash";
  if (type === "sale" || type === "purchase" || type === "expense") return "cash";
  return "cash";
}

export async function importTransactionRows(
  businessId: string,
  profileId: string,
  rows: ParsedImportRow[],
): Promise<{ imported: number; failed: number; errors: string[] }> {
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const input: RecordTransactionInput = {
      type: row.type,
      amount: row.amount,
      description: row.description,
      paymentMethod: normalizePayment(row.paymentMethod) ?? defaultPayment(row.type),
      occurredAt: row.occurredAt,
    };

    const { error } = await createTransaction(businessId, profileId, input);
    if (error) {
      failed++;
      errors.push(`Row ${i + 1}: ${error}`);
    } else {
      imported++;
    }
  }

  return { imported, failed, errors };
}
