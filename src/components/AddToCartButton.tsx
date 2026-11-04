"use client";
import { useState } from "react";
import {useStockDisplay} from "@/lib/use-stock-display";
import {webPurchaseStock} from "@/lib/web-purchase-stock";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";
import { stockOrderLimit } from "@/lib/stock";

type Props = {
  product: Omit<CartItem, "qty">;
  disabled?: boolean;
  className?: string;
};

export function AddToCartButton({ product, disabled, className = "" }: Props) {
  const { add, actionNotice, inventoryError } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const sale=webPurchaseStock(product.stockStatus,product.stockQty,useStockDisplay(product.id));
  const unavailable = stockOrderLimit(sale.stockStatus,sale.stockQty)===0 || product.unitPrice<=0;
  const isDisabled = disabled || unavailable;

  async function onClick() {
    if (isDisabled) return;
    if(!(await add(product, 1)))return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div className={className}><div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 hover:shadow-accent-500/50 active:scale-95 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400 disabled:shadow-none"
      >
        {added ? (
          <>
            <Check className="size-4" />
            Agregado
          </>
        ) : (
          <>
            <ShoppingCart className="size-4" />
            Agregar al carrito
          </>
        )}
      </button>
      <button
        type="button"
        onClick={async () => {
          if (isDisabled) return;
          if(!(await add(product, 1)))return;
          router.push("/carrito");
        }}
        disabled={isDisabled}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-6 py-3 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Comprar ahora
      </button>
    </div>{actionNotice?.id===product.id&&<p role="alert" className="mt-2 text-sm text-red-700">{actionNotice.message}</p>}{inventoryError&&<p role="alert" className="mt-2 text-sm text-red-700">{inventoryError}</p>}</div>
  );
}
