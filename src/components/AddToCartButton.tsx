"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";

type Props = {
  product: Omit<CartItem, "qty">;
  disabled?: boolean;
  className?: string;
};

export function AddToCartButton({ product, disabled, className = "" }: Props) {
  const { add } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function onClick() {
    if (disabled) return;
    add(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div className={`flex flex-col gap-2 sm:flex-row ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 hover:shadow-accent-500/50 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40 disabled:shadow-none"
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
        onClick={() => {
          if (disabled) return;
          add(product, 1);
          router.push("/carrito");
        }}
        disabled={disabled}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Comprar ahora
      </button>
    </div>
  );
}
