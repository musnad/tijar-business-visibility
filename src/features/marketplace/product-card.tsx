"use client";

import { Link } from "@tanstack/react-router";
import { Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/auth-context";
import { addToCart } from "@/services/marketplace-service";
import { formatNgn } from "@/utils/money";
import type { PublicProduct } from "@/types/database";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  compact = false,
}: {
  product: PublicProduct;
  compact?: boolean;
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
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,40,50,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md",
        compact && "rounded-xl",
      )}
    >
      <div className={cn("relative overflow-hidden bg-muted", compact ? "aspect-[4/3]" : "aspect-square")}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 bg-[linear-gradient(145deg,oklch(0.96_0.02_175),oklch(0.93_0.03_195))] text-muted-foreground">
            <Store className="size-7 opacity-50" />
            <span className="text-[10px] font-semibold">No photo</span>
          </div>
        )}
        {product.kind === "service" && (
          <span className="absolute left-2 top-2 rounded-full bg-background/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary shadow-sm">
            Service
          </span>
        )}
        <button
          type="button"
          aria-label={`Add ${product.name} to cart`}
          className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105 active:scale-95"
          onClick={(e) => void quickAdd(e)}
        >
          <Plus className="size-4" strokeWidth={2.75} />
        </button>
      </div>
      <div className={cn("flex flex-1 flex-col", compact ? "p-2" : "p-2.5")}>
        <p className="line-clamp-2 text-[13px] font-bold leading-snug text-foreground">{product.name}</p>
        <p className="mt-1 text-[15px] font-extrabold tracking-tight text-primary">
          {product.sale_price != null ? formatNgn(Number(product.sale_price)) : "Ask seller"}
          {product.sale_price != null && product.unit && product.unit !== "piece" ? (
            <span className="ml-1 text-[10px] font-semibold text-muted-foreground">/{product.unit}</span>
          ) : null}
        </p>
        <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
          {product.business_name ?? "TIJAR shop"}
        </p>
      </div>
    </Link>
  );
}
