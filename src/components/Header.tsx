"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { NavHeader } from "@/components/ui/nav-header";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthButton } from "@/components/AuthButton";
import { useCart } from "@/lib/cart";
import { MothersDayDecor } from "@/components/seasonal/MothersDayDecor";
import type { NavItem } from "@/lib/category-tree";

export function Header({
  menu,
  initialDark = false,
  initialAuthed = false,
  seasonal = null,
}: {
  menu: NavItem[];
  initialDark?: boolean;
  initialAuthed?: boolean;
  /** Temporada activa. Se decide en el servidor para no romper la hidratacion. */
  seasonal?: "mothers-day" | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count } = useCart();
  const pathname = usePathname() ?? "/";

  return (
    <header className="relative z-40 border-b border-ink-200 bg-white text-ink-900">
      <div className="relative">
      {seasonal === "mothers-day" && <MothersDayDecor />}
      <div className="relative mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4 md:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/icb-logo.png"
            alt="ICB Technologies Costa Rica"
            width={200}
            height={64}
            className="h-10 w-auto object-contain transition sm:h-14"
            priority
          />
        </Link>

        <form action="/productos" className="hidden flex-1 md:block">
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
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm bg-accent-600 px-5 py-1.5 text-xs font-bold text-ink-900 transition-colors hover:bg-accent-500"
            >
              Buscar
            </button>
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle initialDark={initialDark} />
          <AuthButton initialAuthed={initialAuthed} />
          <Link
            href="/carrito"
            aria-label="Carrito"
            className="relative inline-flex h-10 items-center gap-2 rounded-md border border-ink-200 px-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50 sm:px-3"
          >
            <ShoppingCart className="size-5" />
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-ink-900 ring-2 ring-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          <button
            aria-label={mobileOpen ? "Cerrar menú" : "Menú"}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <form action="/productos" className="relative mx-auto max-w-7xl px-3 pb-3 sm:px-4 md:hidden">
        <label className="relative block">
          <span className="sr-only">Buscar productos</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            type="search"
            name="q"
            placeholder="Buscar productos..."
            className="h-11 w-full rounded-md border border-ink-200 bg-ink-50 pl-11 pr-12 text-sm font-medium text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:shadow-[var(--shadow-glow)]"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-accent-600 text-ink-900 transition-colors hover:bg-accent-500"
          >
            <Search className="size-4" aria-hidden />
          </button>
        </label>
      </form>
      </div>

      <div className="hidden border-t border-brand-700 bg-brand-900 md:block">
        <NavHeader items={menu} />
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-200 bg-white md:hidden">
          <ul>
            {menu.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`flex items-center px-4 py-3.5 text-sm font-medium ${
                    pathname === n.href ? "bg-ink-50 text-brand-600" : "text-ink-700"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-ink-100 p-4">
            <AuthButton
              initialAuthed={initialAuthed}
              full
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </header>
  );
}
