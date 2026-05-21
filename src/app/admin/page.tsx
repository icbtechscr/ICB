import Link from "next/link";
import { Package, Tag, AlertTriangle, ArrowRight } from "lucide-react";
import { adminStats } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const stats = await adminStats();
  const cards = [
    {
      Icon: Package,
      label: "Productos",
      value: stats.productCount,
      href: "/admin/productos",
      tint: "bg-brand-50 text-brand-600",
    },
    {
      Icon: Tag,
      label: "En oferta",
      value: stats.onSaleCount,
      href: "/admin/productos?on_sale=1",
      tint: "bg-accent-50 text-accent-700",
    },
    {
      Icon: AlertTriangle,
      label: "Agotados",
      value: stats.outOfStockCount,
      href: "/admin/productos?out=1",
      tint: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">
          Resumen general del catálogo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ Icon, label, value, href, tint }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-ink-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"
          >
            <div className="flex items-center justify-between">
              <div className={`inline-flex size-10 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="size-5" />
              </div>
              <ArrowRight className="size-4 text-ink-400 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="mt-4 text-3xl font-black tabular-nums">
              {value.toLocaleString("es-CR")}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-500">
              {label}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/productos/nuevo"
          className="group flex items-center justify-between rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-5 transition-colors hover:bg-brand-50"
        >
          <div>
            <div className="text-sm font-bold text-brand-700">Crear producto</div>
            <div className="mt-0.5 text-xs text-ink-500">
              Agregar nuevo artículo al catálogo
            </div>
          </div>
          <ArrowRight className="size-4 text-brand-600 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/admin/productos"
          className="group flex items-center justify-between rounded-2xl border border-ink-200 bg-white p-5 transition-colors hover:bg-ink-50"
        >
          <div>
            <div className="text-sm font-bold text-ink-900">Gestionar productos</div>
            <div className="mt-0.5 text-xs text-ink-500">
              Editar, eliminar, marcar oferta o stock
            </div>
          </div>
          <ArrowRight className="size-4 text-ink-500 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
