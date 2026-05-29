"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart, Menu, LogIn } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { NavHeader } from "@/components/ui/nav-header";
import { useCart } from "@/lib/cart";
import type { NavItem } from "@/lib/category-tree";

export function Header({ menu }: { menu: NavItem[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count } = useCart();
  const pathname = usePathname() ?? "/";

  return (
    <header className="relative z-40 border-b border-ink-200 bg-white text-ink-900">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:py-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/icb-logo.png"
            alt="ICB Tech"
            width={200}
            height={64}
            className="h-12 w-auto object-contain transition sm:h-14"
            priority
          />
        </Link>

        <form action="/buscar" className="hidden flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">Buscar productos</span>
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              type="search"
              name="q"
              placeholder="Tenemos lo que estás buscando"
              className="w-full rounded-sm border border-ink-300 bg-white py-2.5 pl-11 pr-28 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-brand-500 focus:shadow-[var(--shadow-glow)]"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm bg-accent-600 px-5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent-500"
            >
              Buscar
            </button>
          </label>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/ingresar"
            className="hidden items-center gap-2 rounded-md border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50 sm:inline-flex"
          >
            <LogIn className="size-4" />
            Iniciar sesión
          </Link>
          <Link
            href="/carrito"
            aria-label="Carrito"
            className="relative inline-flex items-center gap-2 rounded-md border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            <ShoppingCart className="size-5" />
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-ink-900 ring-2 ring-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <button
            aria-label="Menú"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 md:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <div className="hidden border-t border-brand-700 bg-brand-900 md:block">
        <NavHeader items={menu} />
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-200 bg-white md:hidden">
          <form action="/buscar" className="px-4 py-3">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <input
                type="search"
                name="q"
                placeholder="Buscar..."
                className="w-full rounded-full border border-ink-200 bg-ink-50 py-2.5 pl-11 pr-4 text-sm text-ink-900"
              />
            </label>
          </form>
          <ul className="border-t border-ink-100">
            {menu.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    pathname === n.href ? "bg-ink-50 text-brand-600" : "text-ink-700"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
