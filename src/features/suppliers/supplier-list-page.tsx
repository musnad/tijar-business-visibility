"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supplierFormSchema } from "@/features/transactions/schemas";
import { useTranslation } from "@/lib/i18n/context";
import { createSupplier, deleteSupplier, listSuppliers } from "@/services/supplier-service";
import type { Supplier } from "@/types/database";
import { formatNgn } from "@/utils/money";

export function SupplierListPage({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    void listSuppliers(businessId).then(({ data, error }) => {
      if (error) toast.error(error);
      setRows(data);
    });
  }, [businessId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addSupplier() {
    const parsed = supplierFormSchema.safeParse({ name, phone: phone || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? t("app.errors.validation"));
      return;
    }
    setSaving(true);
    const { error } = await createSupplier(businessId, parsed.data);
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    setName("");
    setPhone("");
    toast.success(t("app.suppliers.saved"));
    reload();
  }

  async function remove(id: string) {
    const { error } = await deleteSupplier(id);
    if (error) toast.error(error);
    else reload();
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border p-4">
        <h2 className="font-bold">{t("app.suppliers.addTitle")}</h2>
        <Label className="mt-4 block">{t("app.suppliers.name")}</Label>
        <Input className="mt-2 min-h-12" value={name} onChange={(e) => setName(e.target.value)} />
        <Label className="mt-3 block">{t("app.suppliers.phone")}</Label>
        <Input className="mt-2 min-h-12" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button type="button" className="mt-4 min-h-12 w-full" disabled={saving} onClick={() => void addSupplier()}>
          {t("app.suppliers.add")}
        </Button>
      </div>

      <div>
        <h2 className="font-bold">{t("app.suppliers.listTitle")}</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("app.suppliers.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {rows.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                  <p className="text-xs text-muted-foreground">
                    {t("app.suppliers.weOwe")}: {formatNgn(Number(s.balance_owed))}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => void remove(s.id)}>
                  {t("app.common.delete")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
