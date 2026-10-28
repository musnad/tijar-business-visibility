"use client";

import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { addToCart } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";
import type { PublicProduct } from "@/types/database";
import { useQueryClient } from "@tanstack/react-query";

export function ProductCard({
  product,
}: {
  product: PublicProduct & { business_name?: string; business_slug?: string };
}) {
  const { profile, session } = useAuth();
  const queryClient = useQueryClient();

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session || !profile) {
      toast.message("Sign in to add items to your cart.");
      return;
    }
    if (product.sale_price == null) {
      toast.message("This product has no price yet.");
      return;
    }
    const { error } = await addToCart(profile.id, {
      businessId: product.business_id,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      unitPrice: Number(product.sale_price),
      imageUrl: product.image_url,
    });
    if (error) toast.error(error);
    else {
      toast.success("Added to cart");
      void queryClient.invalidateQueries({ queryKey: ["marketplace-cart"] });
    }
  }

  return (
    <Link
      to="/shop/p/$productId"
      params={{ productId: product.id }}
      className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-square bg-muted">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">No photo</div>
        )}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-sm font-bold leading-snug">{product.name}</p>
        <p className="mt-1 text-sm font-extrabold text-teal-800">
          {product.sale_price != null ? formatNgn(Number(product.sale_price)) : "Ask seller"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{product.business_name ?? "TIJAR shop"}</p>
        <Button
          type="button"
          size="sm"
          className="mt-2 h-8 w-full rounded-xl text-xs font-bold"
          onClick={(e) => void quickAdd(e)}
        >
          <ShoppingCart className="mr-1 size-3.5" /> Add
        </Button>
      </div>
    </Link>
  );
}
