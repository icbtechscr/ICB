import Link from "next/link";
import {
  BadgeDollarSign,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  PackageSearch,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";
import { getQuoteAnalytics } from "@/lib/cpi-quotes";
import { BarList, DayBars, StatCard, type BarItem } from "@/components/admin/SalesCharts";
import { SyncQuotesButton } from "@/components/admin/SyncQuotesButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cotizaciones CPI - ICB Admin" };

const CRC = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

function formatCRC(n: number) {
  return CRC.format(Math.round(n || 0));
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function crYearMonth() {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const [year, month1] = s.split("-").map(Number);
  return { year, month1 };
}

function monthLabel(year: number, month1: number) {
  return new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric" }).format(
    new Date(year, month1 - 1, 1)
  );
}

function shift(year: number, month1: number, delta: number) {
  const d = new Date(year, month1 - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(year: number, month1: number) {
  const days = new Date(year, month1, 0).getDate();
  const mm = String(month1).padStart(2, "0");
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(days).padStart(2, "0")}`,
  };
}

function money(crc: number, usd: number) {
  return usd > 0 ? `${formatCRC(crc)} / ${fmtUSD(usd)}` : formatCRC(crc);
}

function shortDate(value: string | null) {
  if (!value) return "-";
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`
    : value;
}

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const now = crYearMonth();
  let year = now.year;
  let month1 = now.month1;
  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      year = y;
      month1 = m;
    }
  }

  const bounds = monthBounds(year, month1);
  const analytics = await getQuoteAnalytics(year, month1);
  const diasConCotizaciones = analytics.porDia.filter((d) => d.count > 0).length;
  const promedioDiario = diasConCotizaciones
    ? Math.round(analytics.count / diasConCotizaciones)
    : 0;
  const mejorDia = analytics.porDia.reduce(
    (best, day) => (day.count > best.count ? day : best),
    { day: "", count: 0, crc: 0, usd: 0 }
  );

  const vendedorItems: BarItem[] = analytics.porVendedor.map((bucket) => ({
    label: bucket.key,
    value: bucket.count,
    display: `${bucket.count}`,
    sub: money(bucket.crc, bucket.usd),
  }));
  const sucursalItems: BarItem[] = analytics.porSucursal.map((bucket) => ({
    label: bucket.key,
    value: bucket.count,
    display: `${bucket.count}`,
    sub: money(bucket.crc, bucket.usd),
  }));
  const clienteItems: BarItem[] = analytics.porCliente.map((bucket) => ({
    label: bucket.key,
    value: bucket.count,
    display: `${bucket.count}`,
    sub: money(bucket.crc, bucket.usd),
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-ink-900">
            <ClipboardList className="size-6 text-brand-600" /> Cotizaciones CPI
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            Reporte diario de cotizaciones y productos mas cotizados desde CPI.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <SyncQuotesButton from={bounds.from} to={bounds.to} />
          <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1">
            <Link
              href={`?mes=${shift(year, month1, -1)}`}
              className="inline-flex size-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-32 px-2 text-center text-sm font-bold capitalize text-ink-900">
              {monthLabel(year, month1)}
            </span>
            <Link
              href={`?mes=${shift(year, month1, 1)}`}
              className="inline-flex size-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {!analytics.hasData ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-soft">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <PackageSearch className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-black text-ink-900">Sin cotizaciones este mes</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-600">
            Sincroniza CPI para cargar las cotizaciones de {monthLabel(year, month1)}.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Monto cotizado (CRC)"
              value={formatCRC(analytics.totalCRC)}
              Icon={BadgeDollarSign}
              accent="brand"
            />
            <StatCard
              label="Monto cotizado (USD)"
              value={fmtUSD(analytics.totalUSD)}
              Icon={ReceiptText}
              accent="accent"
            />
            <StatCard
              label="Cotizaciones"
              value={String(analytics.count)}
              sub={`${diasConCotizaciones} dia(s) con movimiento`}
              Icon={FileText}
              accent="brand"
            />
            <StatCard
              label="Ticket promedio"
              value={formatCRC(analytics.ticketPromedioCRC)}
              Icon={TrendingUp}
              accent="warn"
            />
            <StatCard
              label="Promedio diario"
              value={String(promedioDiario)}
              Icon={CalendarDays}
              accent="brand"
            />
            <StatCard
              label="Mejor dia"
              value={mejorDia.count ? String(mejorDia.count) : "0"}
              sub={mejorDia.day ? shortDate(mejorDia.day) : undefined}
              Icon={TrendingUp}
              accent="accent"
            />
            <StatCard
              label="Vendedores"
              value={String(analytics.vendedores)}
              Icon={Users}
              accent="brand"
            />
            <StatCard
              label="Clientes"
              value={String(analytics.clientes)}
              Icon={Users}
              accent="accent"
            />
          </div>

          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 text-sm font-bold text-ink-900">Cotizaciones por dia</h2>
            <DayBars
              data={analytics.porDia.map((day) => ({ day: day.day, value: day.count }))}
              fmt={(n) => `${n} cotizacion(es)`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-bold text-ink-900">Por vendedor</h2>
              <BarList items={vendedorItems} accent="brand" />
            </section>
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-bold text-ink-900">Por sucursal</h2>
              <BarList items={sucursalItems} accent="accent" />
            </section>
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-bold text-ink-900">Mejores clientes</h2>
              <BarList items={clienteItems} accent="warn" />
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
            <h2 className="border-b border-ink-100 px-5 py-3.5 text-sm font-bold text-ink-900">
              Productos mas cotizados
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-2.5 font-bold">Producto</th>
                    <th className="px-3 py-2.5 text-right font-bold">COTs</th>
                    <th className="px-3 py-2.5 text-right font-bold">Cantidad</th>
                    <th className="px-3 py-2.5 text-right font-bold">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((product) => (
                    <tr key={`${product.sku}-${product.descripcion}`} className="border-b border-ink-50 last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="max-w-xl font-semibold text-ink-800">{product.descripcion}</p>
                        {product.sku && <p className="text-xs text-ink-400">{product.sku}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-brand-600">
                        {product.quoteCount}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-700">
                        {product.cantidad.toLocaleString("es-CR", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-ink-900">
                        {money(product.crc, product.usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
            <h2 className="border-b border-ink-100 px-5 py-3.5 text-sm font-bold text-ink-900">
              Ultimas cotizaciones sincronizadas
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-2.5 font-bold">COT</th>
                    <th className="px-3 py-2.5 font-bold">Fecha</th>
                    <th className="px-3 py-2.5 font-bold">Cliente</th>
                    <th className="px-3 py-2.5 font-bold">Vendedor</th>
                    <th className="px-3 py-2.5 text-right font-bold">Lineas</th>
                    <th className="px-3 py-2.5 text-right font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentQuotes.map((quote) => (
                    <tr key={quote.quoteNumber} className="border-b border-ink-50 last:border-0">
                      <td className="px-4 py-2.5 font-black text-brand-600">{quote.quoteNumber}</td>
                      <td className="px-3 py-2.5 text-ink-600">{shortDate(quote.fecha)}</td>
                      <td className="px-3 py-2.5 font-semibold text-ink-800">{quote.cliente || "-"}</td>
                      <td className="px-3 py-2.5 text-ink-600">{quote.vendedor || "-"}</td>
                      <td className="px-3 py-2.5 text-right text-ink-700">{quote.lineCount}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-ink-900">
                        {quote.moneda === "USD" ? fmtUSD(quote.subtotal) : formatCRC(quote.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
