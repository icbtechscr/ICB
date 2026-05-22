"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package,
  ShoppingBag,
  Settings,
  Home,
  Store,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const TABS = [
  { href: "/admin", label: "Productos", Icon: Package },
  { href: "/admin/tienda", label: "Tienda", Icon: Store },
  { href: "/admin/pedidos", label: "Pedidos", Icon: ShoppingBag, soon: true },
  { href: "/admin/ajustes", label: "Ajustes", Icon: Settings },
];

export function AdminShell({
  children,
  initialDark,
}: {
  children: React.ReactNode;
  initialDark: boolean;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [dark, setDark] = useState(initialDark);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let active = true;
    createSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (!active) return;
        const u = data.user;
        const full = (u?.user_metadata?.full_name as string) ?? "";
        setName(full || u?.email?.split("@")[0] || "");
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  function toggleTheme() {
    setDark((d) => {
      const next = !d;
      document.cookie = `admin-theme=${
        next ? "dark" : "light"
      }; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  // Login: sin chrome del panel
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function logout() {
    await createSupabaseBrowser().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div
      className={`min-h-screen bg-ink-50 text-ink-900 ${dark ? "admin-dark" : ""}`}
    >
      <div className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-lg font-black tracking-tight text-brand-600"
            >
              ICB Admin
            </Link>
            <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-700">
              Beta
            </span>
            {name && (
              <span className="hidden text-sm text-ink-500 sm:inline">
                Hola, <span className="font-semibold text-ink-800">{name}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={dark ? "Modo claro" : "Modo noche"}
              className="inline-flex size-8 items-center justify-center rounded-full border border-ink-200 text-ink-700 hover:bg-ink-100"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
            >
              <Home className="size-3.5" />
              Ver sitio
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-3.5" />
              Salir
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl px-4">
          <ul className="flex gap-1 overflow-x-auto">
            {TABS.map(({ href, label, Icon, soon }) => (
              <li key={href}>
                <Link
                  href={soon ? "#" : href}
                  aria-disabled={soon}
                  className={`relative inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    soon
                      ? "cursor-not-allowed border-transparent text-ink-300"
                      : pathname === href
                        ? "border-brand-600 text-brand-600"
                        : "border-transparent text-ink-600 hover:border-brand-600 hover:text-brand-600"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                  {soon && (
                    <span className="ml-1 rounded-full bg-ink-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-600">
                      Pronto
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
