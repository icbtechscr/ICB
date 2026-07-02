"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Store } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { modulesForRole } from "@/components/portal/modules";
import type { UserRole } from "@/lib/roles";

function isActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalShell({
  children,
  name,
  role,
}: {
  children: React.ReactNode;
  name: string;
  role: UserRole;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const modules = modulesForRole(role);

  async function logout() {
    await createSupabaseBrowser().auth.signOut();
    router.replace("/ingresar");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* Encabezado */}
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/portal"
              className="shrink-0 text-lg font-black tracking-tight text-brand-600"
            >
              Portal ICB
            </Link>
            {name && (
              <span className="hidden truncate text-sm text-ink-500 sm:inline">
                Hola, <span className="font-semibold text-ink-800">{name}</span>
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
            >
              <Store className="size-3.5" />
              <span className="hidden sm:inline">Ver tienda</span>
              <span className="sm:hidden">Tienda</span>
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

        {/* Navegación superior (solo desktop) */}
        <nav className="mx-auto hidden max-w-5xl px-4 md:block">
          <ul className="flex gap-1 overflow-x-auto">
            {modules.map((m) => {
              const active = isActive(pathname, m.href);
              return (
                <li key={m.id}>
                  <Link
                    href={m.href}
                    className={`relative inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                      active
                        ? "border-brand-600 text-brand-600"
                        : "border-transparent text-ink-600 hover:border-brand-600 hover:text-brand-600"
                    }`}
                  >
                    <m.Icon className="size-4" />
                    {m.navLabel}
                    {m.comingSoon && (
                      <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-400">
                        Pronto
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Contenido: deja espacio abajo para la barra móvil */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:pb-16 md:pt-8">
        {children}
      </main>

      {/* Barra de navegación inferior (solo móvil, estilo app) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex">
          {modules.map((m) => {
            const active = isActive(pathname, m.href);
            return (
              <li key={m.id} className="min-w-0 flex-1">
                <Link
                  href={m.href}
                  className={`relative flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-bold ${
                    active ? "text-brand-600" : "text-ink-500"
                  }`}
                >
                  <m.Icon className="size-5" />
                  <span className="max-w-full truncate">{m.navLabel}</span>
                  {m.comingSoon && (
                    <span className="absolute right-1/2 top-1.5 size-1.5 translate-x-4 rounded-full bg-warn" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
