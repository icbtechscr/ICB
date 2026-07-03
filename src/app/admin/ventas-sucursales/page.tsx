import Link from "next/link";
import {
  Wallet, DollarSign, ShoppingBag, Receipt, Building2, TrendingUp,
  ChevronLeft, ChevronRight, Store, BadgeCheck, CalendarDays, Users,
} from "lucide-react";
import { getSalesAnalytics } from "@/lib/cpi-analytics";
import { formatCRC } from "@/lib/utils";
import { StatCard, BarList, DayBars, SplitBar, type BarItem } from "@/components/admin/SalesCharts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas de sucursal — ICB Admin" };

function crYearMonth() {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit" }).format(new Date());
  const [y, m] = s.split("-").map(Number);
  return { year: y, month1: m };
}
function fmtUSD(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function monthLabel(y: number, m: number) { return new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1)); }
function shift(y: number, m: number, d: number) { const x = new Date(y, m - 1 + d, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; }

export default async function VentasSucursalesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const now = crYearMonth();
  let year = now.year, month1 = now.month1;
  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    if (m >= 1 && m <= 12) { year = y; month1 = m; }
  }

  const a = await getSalesAnalytics(year, month1);
  const toMoney = (crc: number, usd: number) => (usd > 0 ? `${formatCRC(crc)} · ${fmtUSD(usd)}` : formatCRC(crc));

  const diasConVentas = a.porDia.filter((d) => d.crc > 0).length;
  const promedioDiario = diasConVentas ? Math.round(a.totalCRC / diasConVentas) : 0;
  const mejorDia = a.porDia.reduce((mx, d) => (d.crc > mx.crc ? d : mx), { day: "", crc: 0, usd: 0, count: 0 });
  const growth = a.prevMonthCRC > 0 ? Math.round(((a.totalCRC - a.prevMonthCRC) / a.prevMonthCRC) * 1000) / 10 : null;

  const sucItems: BarItem[] = a.porSucursal.map((b) => ({ label: b.key, value: b.crc + b.usd * 520, display: toMoney(b.crc, b.usd), sub: `${b.count} factura(s)` }));
  const pvItems: BarItem[] = a.porPuntoVenta.map((b) => ({ label: b.key, value: b.crc + b.usd * 520, display: toMoney(b.crc, b.usd), sub: `${b.count} factura(s)` }));
  const cliItems: BarItem[] = a.porCliente.map((b) => ({ label: b.key, value: b.crc + b.usd * 520, display: toMoney(b.crc, b.usd), sub: `${b.count} factura(s)` }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-ink-900">
            <Store className="size-6 text-brand-600" /> Ventas de sucursal
          </h1>
          <p className="mt-1 text-sm text-ink-600">Facturación por sucursal. Datos de CPI, actualizados con cada sincronización.</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1">
          <Link href={`?mes=${shift(year, month1, -1)}`} className="inline-flex size-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"><ChevronLeft className="size-4" /></Link>
          <span className="min-w-32 px-2 text-center text-sm font-bold capitalize text-ink-900">{monthLabel(year, month1)}</span>
          <Link href={`?mes=${shift(year, month1, 1)}`} className="inline-flex size-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"><ChevronRight className="size-4" /></Link>
        </div>
      </div>

      {!a.hasData ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-soft">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><TrendingUp className="size-7" /></span>
          <h2 className="mt-4 text-lg font-black text-ink-900">Sin ventas este mes</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-600">No hay facturas sincronizadas para {monthLabel(year, month1)}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Vendido (colones)" value={formatCRC(a.totalCRC)} sub={growth != null ? `${growth >= 0 ? "▲" : "▼"} ${Math.abs(growth)}% vs mes anterior` : undefined} Icon={Wallet} accent="accent" />
            <StatCard label="Vendido (dólares)" value={fmtUSD(a.totalUSD)} Icon={DollarSign} accent="brand" />
            <StatCard label="Facturas" value={String(a.count)} sub={`${a.aceptadas} aceptadas · ${a.rechazadas} rechazadas`} Icon={ShoppingBag} accent="brand" />
            <StatCard label="Ticket promedio (₡)" value={formatCRC(a.ticketPromedioCRC)} Icon={Receipt} accent="warn" />
            <StatCard label="Promedio diario (₡)" value={formatCRC(promedioDiario)} sub={`${diasConVentas} día(s) con ventas`} Icon={CalendarDays} accent="brand" />
            <StatCard label="Mejor día (₡)" value={formatCRC(mejorDia.crc)} sub={mejorDia.day ? mejorDia.day.slice(8, 10) + "/" + mejorDia.day.slice(5, 7) : undefined} Icon={TrendingUp} accent="accent" />
            <StatCard label="Sucursales activas" value={String(a.sucursales)} Icon={Building2} accent="brand" />
            <StatCard label="Aceptación" value={a.count ? `${Math.round((a.aceptadas / a.count) * 100)}%` : "—"} Icon={BadgeCheck} accent="accent" />
          </div>

          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 text-sm font-bold text-ink-900">Ventas por día (colones)</h2>
            <DayBars data={a.porDia.map((d) => ({ day: d.day, value: d.crc }))} fmt={formatCRC} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900"><Building2 className="size-4 text-brand-600" /> Por sucursal</h2>
              <BarList items={sucItems} accent="brand" rank={false} />
            </section>
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900"><Users className="size-4 text-brand-600" /> Mejores clientes</h2>
              <BarList items={cliItems} accent="accent" />
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-bold text-ink-900">Estado de las facturas</h2>
              <SplitBar segments={[
                { label: "Aceptadas", value: a.aceptadas, color: "bg-accent-500" },
                { label: "Rechazadas", value: a.rechazadas, color: "bg-red-400" },
              ]} />
              <div className="mt-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Por punto de venta</h3>
                <BarList items={pvItems} accent="brand" rank={false} />
              </div>
            </section>
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-bold text-ink-900">Por tipo de documento</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="pb-2 font-bold">Tipo</th>
                    <th className="pb-2 text-right font-bold">Cantidad</th>
                    <th className="pb-2 text-right font-bold">Monto (₡)</th>
                  </tr>
                </thead>
                <tbody>
                  {a.porTipo.map((t) => (
                    <tr key={t.key} className="border-b border-ink-50 last:border-0">
                      <td className="py-2 font-semibold text-ink-800">{t.key}</td>
                      <td className="py-2 text-right text-ink-700">{t.count}</td>
                      <td className="py-2 text-right font-bold text-ink-900">{formatCRC(t.crc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
