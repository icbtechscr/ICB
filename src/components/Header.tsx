"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart, Heart, Menu } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { NavHeader } from "@/components/ui/nav-header";
import { useCart } from "@/lib/cart";

const NAV = [
  { label: "Inicio", href: "/" },
  { label: "Computadoras", href: "/categoria/computadoras" },
  { label: "Seguridad", href: "/categoria/camaras-de-vigilancia" },
  { label: "Redes", href: "/categoria/redes" },
  { label: "POS", href: "/categoria/punto-de-venta" },
  { label: "Ofertas", href: "/ofertas" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count } = useCart();
  const pathname = usePathname() ?? "/";
  const transparentRoute =
    pathname === "/" ||
    /^\/productos\/[^/]+$/.test(pathname) ||
    pathname === "/carrito" ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/");
  const solid = !transparentRoute;

  return (
    <header
      className={`relative z-40 ${
        solid
          ? "border-b border-ink-200 bg-white text-ink-900"
          : "border-b border-transparent bg-transparent text-white"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/icb-logo.png"
            alt="ICB Tech"
            width={200}
            height={64}
            className={`h-12 w-auto object-contain transition sm:h-14 ${
              solid ? "" : "brightness-0 invert"
            }`}
            priority
          />
        </Link>

        <form action="/buscar" className="hidden flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">Buscar productos</span>
            <Search
              className={`absolute left-4 top-1/2 size-4 -translate-y-1/2 ${
                solid ? "text-ink-400" : "text-white/70"
              }`}
              aria-hidden
            />
            <input
              type="search"
              name="q"
              placeholder="Buscar productos, marcas, SKU..."
              className={`w-full rounded-full py-2.5 pl-11 pr-28 text-sm outline-none transition-all placeholder:opacity-70 ${
                solid
                  ? "border border-ink-200 bg-ink-50/80 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:shadow-[var(--shadow-glow)]"
                  : "border border-white/25 bg-white/10 text-white placeholder:text-white/60 backdrop-blur-md focus:border-accent-400 focus:bg-white/15"
              }`}
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-accent-500 px-5 py-1.5 text-xs font-bold text-ink-900 transition-colors hover:bg-accent-400"
            >
              Buscar
            </button>
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <button
            aria-label="Favoritos"
            className={`hidden h-11 w-11 items-center justify-center rounded-full transition-colors md:inline-flex ${
              solid ? "text-ink-700 hover:bg-ink-100 hover:text-brand-600" : "text-white hover:bg-white/15"
            }`}
          >
            <Heart className="size-5" />
          </button>
          <Link
            href="/carrito"
            aria-label="Carrito"
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              solid ? "text-ink-700 hover:bg-ink-100 hover:text-brand-600" : "text-white hover:bg-white/15"
            }`}
          >
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-ink-900 ring-2 ring-white/80">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <button
            aria-label="Menú"
            onClick={() => setMobileOpen((v) => !v)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full md:hidden ${
              solid ? "text-ink-700 hover:bg-ink-100" : "text-white hover:bg-white/15"
            }`}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <div className="hidden pb-3 md:block">
        <NavHeader items={NAV} variant={solid ? "solid" : "transparent"} />
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
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="flex items-center px-4 py-3 text-sm font-medium text-ink-700"
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
