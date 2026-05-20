"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  brand: string | null;
  unitPrice: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartCtx = createContext<CartState | null>(null);
const STORAGE_KEY = "icb-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const add = useCallback<CartState["add"]>((item, qty = 1) => {
    setItems((prev) => {
      const ex = prev.find((p) => p.id === item.id);
      if (ex) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + qty } : p
        );
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const remove = useCallback<CartState["remove"]>((id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setQty = useCallback<CartState["setQty"]>((id, qty) => {
    setItems((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: Math.max(1, qty) } : p))
        .filter((p) => p.qty > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((acc, i) => acc + i.qty, 0);
    const subtotal = items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
    return { items, count, subtotal, add, remove, setQty, clear };
  }, [items, add, remove, setQty, clear]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartCtx);
  if (!ctx) {
    return {
      items: [],
      count: 0,
      subtotal: 0,
      add: () => {},
      remove: () => {},
      setQty: () => {},
      clear: () => {},
    };
  }
  return ctx;
}
