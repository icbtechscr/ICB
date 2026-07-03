import Link from "next/link";
import {
  Trophy, Users, Wallet, Receipt, TrendingUp,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { getVendorPerformance } from "@/lib/cpi-analytics";
import { formatCRC } from "@/lib/utils";
import { StatCard, BarList, type BarItem } from "@/components/admin/SalesCharts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Desempeño de vendedores — ICB Admin" };

function crYearMonth() {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit" }).format(new Date());
  const [y, m] = s.split("-").map(Number);
  return { year: y, month1: m };
}
function fmtUSD(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function monthLabel(y: number, m: number) { return new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1)); }
function shift(y: number, m: number, d: number) { const x = new Date(y, m - 1 + d, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; }

export default async function DesempenoVendedoresPage({
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

  const a = await getVendorPerformance(year, month1);
  const leader = a.vendors[0];

  const rankItems: BarItem[] = a.vendors.slice(0, 15).map((v) => ({
    label: v.vendedor,
    value: v.valor,
    display: v.usd > 0 ? `${formatCRC(v.crc)} · ${fmtUSD(v.usd)}` : formatCRC(v.crc),
    sub: `${v.count} factura(s) · ${v.sharePct}% del total`,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-ink-900">
            <Trophy className="size-6 text-brand-600" /> Desempeño de vendedores
          </h1>
          <p className="mt-1 text-sm text-ink-600">Ranking y métricas por vendedor. Los excluidos no aparecen aquí.</p>
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
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-600">No hay facturas de vendedores para {monthLabel(year, month1)}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Vendedores activos" value={String(a.vendors.length)} Icon={Users} accent="brand" />
            <StatCard label="Líder del mes" value={leader ? leader.vendedor.split(" ").slice(0, 2).join(" ") : "—"} sub={leader ? formatCRC(leader.crc) : undefined} Icon={Trophy} accent="accent" />
            <StatCard label="Total vendido (₡)" value={formatCRC(a.totalCRC)} Icon={Wallet} accent="brand" />
            <StatCard label="Facturas" value={String(a.count)} Icon={Receipt} accent="warn" />
          </div>

          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900"><Trophy className="size-4 text-brand-600" /> Ranking de vendedores</h2>
            <BarList items={rankItems} accent="accent" />
          </section>

          <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
            <h2 className="border-b border-ink-100 px-5 py-3.5 text-sm font-bold text-ink-900">Detalle por vendedor</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-4 py-2.5 font-bold">#</th>
                    <th className="px-4 py-2.5 font-bold">Vendedor</th>
                    <th className="px-3 py-2.5 text-right font-bold">Facturas</th>
                    <th className="px-3 py-2.5 text-right font-bold">Monto (₡)</th>
                    <th className="px-3 py-2.5 text-right font-bold">Ticket (₡)</th>
                    <th className="px-3 py-2.5 text-right font-bold">Aceptación</th>
                    <th className="px-3 py-2.5 text-right font-bold">% total</th>
                  </tr>
                </thead>
                <tbody>
                  {a.vendors.map((v) => (
                    <tr key={v.vendedor} className="border-b border-ink-50 last:border-0">
                      <td className="px-4 py-2.5 font-bold text-ink-400">{v.rank}</td>
                      <td className="px-4 py-2.5 font-semibold text-ink-800">{v.vendedor}</td>
                      <td className="px-3 py-2.5 text-right text-ink-700">{v.count}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-ink-900">
                        {formatCRC(v.crc)}{v.usd > 0 ? ` · ${fmtUSD(v.usd)}` : ""}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-700">{formatCRC(v.ticketCRC)}</td>
                      <td className="px-3 py-2.5 text-right text-ink-700">
                        {v.count ? `${Math.round((v.aceptadas / v.count) * 100)}%` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-brand-600">{v.sharePct}%</td>
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
