import { redirect } from "next/navigation";
import { ShoppingBag, Wallet, Receipt, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-server";
import { getMyMonthlyMetrics, currentMonthLabel } from "@/lib/portal-metrics";
import { formatCRC } from "@/lib/utils";
import { MetricCard } from "@/components/portal/MetricCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ventas",
};

export default async function VentasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const m = await getMyMonthlyMetrics(user.id);
  const avg =
    m.salesAmountCRC != null && m.salesCount
      ? Math.round(m.salesAmountCRC / m.salesCount)
      : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink-900">
            Ventas
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            Tus ventas y el monto vendido del mes.
          </p>
        </div>
        <span className="shrink-0 text-xs capitalize text-ink-500">
          {currentMonthLabel()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Ventas del mes"
          value={m.salesCount == null ? "—" : String(m.salesCount)}
          Icon={ShoppingBag}
          accent="brand"
        />
        <MetricCard
          label="Monto vendido"
          value={m.salesAmountCRC == null ? "—" : formatCRC(m.salesAmountCRC)}
          Icon={Wallet}
          accent="accent"
        />
        <MetricCard
          label="Ticket promedio"
          value={avg == null ? "—" : formatCRC(avg)}
          Icon={Receipt}
          accent="brand"
        />
      </div>

      {/* Detalle (placeholder hasta conectar datos reales) */}
      <section className="mt-6 rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-soft">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <TrendingUp className="size-7" />
        </span>
        <h2 className="mt-4 text-lg font-black tracking-tight text-ink-900">
          Detalle de ventas
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-600">
          Aquí verás cada venta, la fecha y el monto. Vamos a conectar esta
          sección con tus datos reales de ventas.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-warn/15 px-4 py-1.5 text-xs font-bold text-amber-700">
          En construcción
        </p>
      </section>
    </div>
  );
}
