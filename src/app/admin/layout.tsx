import Link from "next/link";
import { Package, ShoppingBag, Settings, Home, Store } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Productos", Icon: Package, exact: true },
  { href: "/admin/tienda", label: "Tienda", Icon: Store },
  { href: "/admin/pedidos", label: "Pedidos", Icon: ShoppingBag, soon: true },
  { href: "/admin/ajustes", label: "Ajustes", Icon: Settings, soon: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
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
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
          >
            <Home className="size-3.5" />
            Ver sitio
          </Link>
        </div>
        <nav className="mx-auto max-w-7xl px-4">
          <ul className="flex gap-1 overflow-x-auto">
            {TABS.map(({ href, label, Icon, soon }) => (
              <li key={href}>
                <Link
                  href={soon ? "#" : href}
                  aria-disabled={soon}
                  className={`relative inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-semibold transition-colors ${
                    soon
                      ? "cursor-not-allowed text-ink-300"
                      : "text-ink-600 hover:border-brand-600 hover:text-brand-600"
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
