"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppPageHeader } from "@/features/app-layout/app-page-header";
import { ProductPhotoField } from "@/features/products/product-photo-field";
import { ProductCard } from "@/features/marketplace/product-card";
import { canPublishProduct, productPublishErrors } from "@/lib/catalogue/publish-guard";
import { parseAttributes, variantsFromSizeColour } from "@/lib/catalogue/variants";
import { invalidateBusinessQueries } from "@/lib/invalidate-business-queries";
import { uploadProductImage } from "@/services/product-image-service";
import { deactivateProduct, getProduct, restoreProduct, setProductPublished, updateProduct, updateProductImageUrl } from "@/services/product-service";
import type { PublicProduct } from "@/types/database";
import { formatNgn } from "@/utils/money";

export function EditProductForm({ businessId, productId }: { businessId: string; productId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["edit-product", productId],
    queryFn: async () => {
      const r = await getProduct(productId);
      if (r.error) throw new Error(r.error);
      if (!r.product || r.product.business_id !== businessId) throw new Error("This product is not in your catalogue.");
      return r.product;
    },
  });

  const product = query.data;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [sizes, setSizes] = useState("");
  const [colours, setColours] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setDescription(product.description || product.notes || "");
    setSalePrice(product.sale_price != null ? String(product.sale_price) : "");
  }, [product]);

  const priceNum = salePrice.trim() ? Number(salePrice) : null;
  const publishErrors = product
    ? productPublishErrors({
        name,
        sale_price: Number.isFinite(priceNum as number) ? priceNum : null,
        image_url: product.image_url,
        is_active: product.is_active,
      })
    : [];

  async function save(publish?: boolean) {
    if (!product) return;
    if (publish && !canPublishProduct({
      name,
      sale_price: Number.isFinite(priceNum as number) ? priceNum : null,
      image_url: product.image_url,
      is_active: product.is_active,
    })) {
      toast.error(publishErrors[0] ?? "Fix validation errors before publishing.");
      return;
    }
    setBusy(true);
    let imageUrl = product.image_url;
    if (imageFile) {
      const uploaded = await uploadProductImage(businessId, product.id, imageFile);
      if (uploaded.publicUrl) {
        imageUrl = uploaded.publicUrl;
        await updateProductImageUrl(product.id, uploaded.publicUrl);
      }
    }
    const attrs = parseAttributes(undefined, undefined);
    const { error } = await updateProduct(product.id, {
      name: name.trim(),
      description: description.trim() || null,
      notes: description.trim() || null,
      sale_price: Number.isFinite(priceNum as number) ? priceNum : null,
      variants: variantsFromSizeColour(sizes, colours),
      attributes: attrs,
      image_url: imageUrl,
      is_published: Number.isFinite(priceNum as number) ? true : (publish ?? product.is_published),
    });
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (Number.isFinite(priceNum as number)) {
      const pub = await setProductPublished(product.id, true);
      if (pub.error) toast.error(pub.error);
    }
    await invalidateBusinessQueries(queryClient, businessId);
    toast.success("Saved");
    void navigate({ to: "/app/products" });
  }

  if (query.isLoading) return <p className="mt-8 text-muted-foreground">…</p>;
  if (!product) return <p className="mt-8 text-sm text-destructive">Product not found for this business.</p>;

  const preview: PublicProduct = {
    id: product.id,
    business_id: product.business_id,
    name,
    kind: product.kind,
    description,
    sale_price: Number.isFinite(priceNum as number) ? Number(priceNum) : null,
    unit: product.unit,
    image_url: product.image_url,
    is_available: product.kind === "service" || Number(product.stock_quantity) > 0,
    business_name: "Your shop",
  };

  return (
    <>
      <AppPageHeader title="Edit product" subtitle="Only members of this shop can save. Preview uses live fields." />
      <div className="mt-4 space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-xl" />
        <textarea className="min-h-24 w-full rounded-xl border px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Sale price (NGN)" className="min-h-11 rounded-xl" inputMode="decimal" />
        <Input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="Sizes (S, M, L)" className="min-h-11 rounded-xl" />
        <Input value={colours} onChange={(e) => setColours(e.target.value)} placeholder="Colours" className="min-h-11 rounded-xl" />
        <ProductPhotoField previewUrl={product.image_url} onFile={setImageFile} onClear={() => setImageFile(null)} />
      </div>
      {publishErrors.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-800">
          {publishErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="mt-5">
        <p className="mb-2 text-sm font-bold">Customer card preview</p>
        <div className="max-w-xs pointer-events-none">
          <ProductCard product={preview} />
        </div>
        {preview.sale_price != null && <p className="mt-1 text-xs text-muted-foreground">{formatNgn(preview.sale_price)}</p>}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <Button className="rounded-xl" disabled={busy} onClick={() => void save(false)}>
          Save
        </Button>
        <Button className="rounded-xl" disabled={busy} onClick={() => void save(true)}>
          Publish to marketplace
        </Button>
        {product.is_active !== false ? (
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={async () => {
              const r = await deactivateProduct(product.id);
              if (r.error) toast.error(r.error);
              else {
                toast.success("Archived");
                await invalidateBusinessQueries(queryClient, businessId);
                void navigate({ to: "/app/products" });
              }
            }}
          >
            Archive
          </Button>
        ) : (
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={async () => {
              const r = await restoreProduct(product.id);
              if (r.error) toast.error(r.error);
              else toast.success("Restored");
            }}
          >
            Restore
          </Button>
        )}
        <Link to="/app/products" className="text-center text-sm font-semibold text-primary">
          Back to catalogue
        </Link>
      </div>
    </>
  );
}
