import {
  Wallet, DollarSign, ShoppingBag, Receipt, Building2, TrendingUp,
  Store, BadgeCheck, CalendarDays, Users, PackageSearch, Trophy, FileSpreadsheet,
} from "lucide-react";
import { getSalesAnalytics, periodRange, type Period } from "@/lib/cpi-analytics";
import { getAllTimeProductRanking, type ProductRankRow } from "@/lib/cpi-products";
import { PeriodNav } from "@/components/PeriodNav";
import { formatCRC } from "@/lib/utils";
import { StatCard, BarList, DayBars, SplitBar, type BarItem } from "@/components/admin/SalesCharts";
import { ReportExportButtons } from "@/components/admin/ReportExportButtons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas de sucursal — ICB Admin" };

function fmtUSD(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function SoldProductsTable({
  products,
  isMonth,
}: {
  products: {
    sku: string;
    descripcion: string;
    cantidad: number;
    crc: number;
    usd: number;
    saleDays: number;
  }[];
  isMonth: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
      <h2 className="border-b border-ink-100 px-5 py-3.5 text-sm font-bold text-ink-900">
        {isMonth ? "Productos m\u00e1s vendidos del mes" : "Productos vendidos hoy"}
      </h2>
      {products.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-500">
          El detalle de productos se mostrar\u00e1 cuando termine la sincronizaci\u00f3n de CPI.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-2.5 font-bold">Producto</th>
                {isMonth && <th className="px-3 py-2.5 text-right font-bold">D\u00edas</th>}
                <th className="px-3 py-2.5 text-right font-bold">Cantidad</th>
                <th className="px-3 py-2.5 text-right font-bold">Monto</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={`${product.sku}-${product.descripcion}`}
                  className="border-b border-ink-50 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <p className="max-w-3xl font-semibold text-ink-800">{product.descripcion}</p>
                    {product.sku && <p className="text-xs text-ink-400">{product.sku}</p>}
                  </td>
                  {isMonth && (
                    <td className="px-3 py-2.5 text-right font-bold text-brand-600">
                      {product.saleDays}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right font-bold text-brand-600">
                    {product.cantidad.toLocaleString("es-CR", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-ink-900">
                    {product.usd > 0
                      ? `${formatCRC(product.crc)} \u00b7 ${fmtUSD(product.usd)}`
                      : formatCRC(product.crc)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProductRankingTable({ rows }: { rows: ProductRankRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
          <Trophy className="size-4 text-brand-600" /> Ranking historico de productos
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-500">
            {rows.length} producto(s) facturado(s) - acumulado desde siempre
          </span>
          <a
            href="/api/admin/reports/products"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm transition hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700"
          >
            <FileSpreadsheet className="size-3.5" /> Excel
          </a>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-500">
          Aun no hay productos facturados sincronizados.
        </div>
      ) : (
        <div className="max-h-[36rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-2.5 font-bold">#</th>
                <th className="px-4 py-2.5 font-bold">Producto</th>
                <th className="px-3 py-2.5 text-right font-bold">Unidades</th>
                <th className="px-3 py-2.5 text-right font-bold">Monto</th>
                <th className="px-3 py-2.5 text-right font-bold">Dias</th>
                <th className="px-3 py-2.5 text-right font-bold">Ultima venta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={`${p.rank}-${p.sku}-${p.descripcion}`} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-2.5 font-bold text-ink-400">{p.rank}</td>
                  <td className="px-4 py-2.5">
                    <p className="max-w-2xl font-semibold text-ink-800">{p.descripcion}</p>
                    {p.sku && <p className="text-xs text-ink-400">{p.sku}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-brand-600">
                    {p.cantidad.toLocaleString("es-CR", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-ink-900">
                    {p.usd > 0 ? `${formatCRC(p.crc)} - ${fmtUSD(p.usd)}` : formatCRC(p.crc)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-ink-600">{p.saleDays}</td>
                  <td className="px-3 py-2.5 text-right text-ink-500">
                    {p.lastSale ? `${p.lastSale.slice(8, 10)}/${p.lastSale.slice(5, 7)}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function VentasSucursalesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; ref?: string }>;
}) {
  const sp = await searchParams;
  const period: Period = sp.period === "month" ? "month" : "day";
  const range = periodRange(period, sp.ref);
  const isMonth = period === "month";

  const a = await getSalesAnalytics(range);
  const ranking = await getAllTimeProductRanking();
  const toMoney = (crc: number, usd: number) => (usd > 0 ? `${formatCRC(crc)} · ${fmtUSD(usd)}` : formatCRC(crc));

  const diasConVentas = a.porDia.filter((d) => d.crc > 0).length;
  const promedioDiario = diasConVentas ? Math.round(a.totalCRC / diasConVentas) : 0;
  const mejorDia = a.porDia.reduce((mx, d) => (d.crc > mx.crc ? d : mx), { day: "", crc: 0, usd: 0, count: 0 });
  const growth = a.prevMonthCRC > 0 ? Math.round(((a.totalCRC - a.prevMonthCRC) / a.prevMonthCRC) * 1000) / 10 : null;
  const growthLabel = growth != null ? `${growth >= 0 ? "▲" : "▼"} ${Math.abs(growth)}% vs ${isMonth ? "mes" : "día"} anterior` : undefined;

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ReportExportButtons kind="sales" period={period} refValue={range.ref} />
          <PeriodNav period={period} refValue={range.ref} label={range.label} />
        </div>
      </div>

      {!a.hasData ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-soft">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><TrendingUp className="size-7" /></span>
          <h2 className="mt-4 text-lg font-black text-ink-900">Sin ventas en este periodo</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-600 first-letter:uppercase">No hay facturas sincronizadas para {range.label}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Vendido (colones)" value={formatCRC(a.totalCRC)} sub={growthLabel} Icon={Wallet} accent="accent" />
            <StatCard label="Vendido (dólares)" value={fmtUSD(a.totalUSD)} Icon={DollarSign} accent="brand" />
            <StatCard label="Facturas" value={String(a.count)} sub={`${a.aceptadas} aceptadas · ${a.rechazadas} rechazadas`} Icon={ShoppingBag} accent="brand" />
            <StatCard label="Ticket promedio (₡)" value={formatCRC(a.ticketPromedioCRC)} Icon={Receipt} accent="warn" />
            {isMonth && <StatCard label="Promedio diario (₡)" value={formatCRC(promedioDiario)} sub={`${diasConVentas} día(s) con ventas`} Icon={CalendarDays} accent="brand" />}
            {isMonth && <StatCard label="Mejor día (₡)" value={formatCRC(mejorDia.crc)} sub={mejorDia.day ? mejorDia.day.slice(8, 10) + "/" + mejorDia.day.slice(5, 7) : undefined} Icon={TrendingUp} accent="accent" />}
            <StatCard label="Sucursales activas" value={String(a.sucursales)} Icon={Building2} accent="brand" />
            <StatCard label="Unidades vendidas" value={a.productUnits.toLocaleString("es-CR", { maximumFractionDigits: 2 })} Icon={ShoppingBag} accent="accent" />
            <StatCard label="Productos vendidos" value={String(a.productCount)} Icon={PackageSearch} accent="brand" />
            <StatCard label="Aceptación" value={a.count ? `${Math.round((a.aceptadas / a.count) * 100)}%` : "—"} Icon={BadgeCheck} accent="accent" />
          </div>

          {isMonth && (
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-bold text-ink-900">Ventas por día (colones)</h2>
              <DayBars data={a.porDia.map((d) => ({ day: d.day, value: d.crc }))} fmt={formatCRC} />
            </section>
          )}

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

          <SoldProductsTable products={a.topProducts} isMonth={isMonth} />

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

      <div className="mt-6">
        <ProductRankingTable rows={ranking} />
      </div>
    </div>
  );
}
