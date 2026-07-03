import { redirect } from "next/navigation";
import {
  ShoppingBag, Wallet, DollarSign, Receipt, Trophy, TrendingUp,
  ChevronLeft, ChevronRight, Building2, PieChart, Medal,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserFullName } from "@/lib/roles";
import { crYearMonth } from "@/lib/portal-metrics";
import {
  getUserSalesAnalytics, getUserMonthlyEvolution, getVendorPerformance,
} from "@/lib/cpi-analytics";
import { getVendorsForUser } from "@/lib/cpi-sales";
import { formatCRC } from "@/lib/utils";
import { MetricCard } from "@/components/portal/MetricCard";
import { BarList, DayBars, SplitBar, type BarItem } from "@/components/admin/SalesCharts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rendimiento" };

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function monthLabel(y: number, m: number) {
  return new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}
function shift(y: number, m: number, d: number) {
  const x = new Date(y, m - 1 + d, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}
function medalClass(r: number): string {
  if (r === 1) return "bg-gradient-to-br from-amber-300 to-amber-500 text-white ring-2 ring-amber-200";
  if (r === 2) return "bg-gradient-to-br from-slate-300 to-slate-400 text-white";
  if (r === 3) return "bg-gradient-to-br from-orange-400 to-amber-700 text-white";
  return "bg-ink-100 text-ink-500";
}

export default async function RendimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  const sp = await searchParams;
  const now = crYearMonth();
  let year = now.year, month1 = now.month1;
  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    if (m >= 1 && m <= 12) { year = y; month1 = m; }
  }

  const a = await getUserSalesAnalytics(user.id, year, month1);
  const evo = await getUserMonthlyEvolution(user.id, 6);
  const perf = await getVendorPerformance(year, month1);
  const myVendors = new Set(await getVendorsForUser(user.id));
  const firstName = (getUserFullName(user) || "").split(" ")[0];

  const evoItems: BarItem[] = evo.map((p) => ({
    label: p.label, value: p.crc, display: formatCRC(p.crc), sub: `${p.count} factura(s)`,
  }));
  const sucItems: BarItem[] = a.porSucursal.map((b) => ({
    label: b.key, value: b.crc + b.usd * 520, display: b.usd > 0 ? `${formatCRC(b.crc)} · ${fmtUSD(b.usd)}` : formatCRC(b.crc),
    sub: `${b.count} factura(s)`,
  }));
  const faltaLider = a.rank && a.rank > 1 ? a.leaderValor - a.myValor : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink-900">Rendimiento</h1>
          <p className="mt-1 text-sm text-ink-600">Tus ventas y tu posición del mes.</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1">
          <a href={`?mes=${shift(year, month1, -1)}`} className="inline-flex size-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"><ChevronLeft className="size-4" /></a>
          <span className="min-w-32 px-2 text-center text-sm font-bold capitalize text-ink-900">{monthLabel(year, month1)}</span>
          <a href={`?mes=${shift(year, month1, 1)}`} className="inline-flex size-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"><ChevronRight className="size-4" /></a>
        </div>
      </div>

      {perf.hasData && (
        <section className="mb-4 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
          <h2 className="flex items-center gap-2 border-b border-ink-100 px-5 py-3.5 text-sm font-bold text-ink-900">
            <Medal className="size-4 text-brand-600" /> Ranking de vendedores
          </h2>
          <ol className="max-h-[26rem] divide-y divide-ink-100 overflow-y-auto">
            {perf.vendors.map((v) => {
              const mine = myVendors.has(v.vendedor);
              return (
                <li key={v.vendedor} className={`flex items-center gap-3 px-4 py-2.5 ${mine ? "bg-brand-50" : ""}`}>
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${medalClass(v.rank)}`}>
                    {v.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">
                    {v.vendedor}
                    {mine && (
                      <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Vos</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-sm font-black text-ink-900">
                    {formatCRC(v.crc)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {!a.hasData ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-soft">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><TrendingUp className="size-7" /></span>
          <h2 className="mt-4 text-lg font-black text-ink-900">Sin ventas este mes</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-600">
            No hay facturas tuyas en {monthLabel(year, month1)}. Si creés que es un
            error, puede ser que tu nombre de vendedor no esté enlazado — avisá a RRHH.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ranking hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lift">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_85%_-10%,rgba(255,255,255,0.35),transparent_50%)]" />
            <div className="relative flex items-center gap-4">
              <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
                <Trophy className="size-8" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Tu posición</p>
                <p className="text-3xl font-black leading-tight">
                  {a.rank ? `#${a.rank}` : "—"}
                  <span className="ml-2 text-sm font-semibold text-white/70">de {a.totalVendedores} vendedores</span>
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {a.sharePct != null ? `Aportás el ${a.sharePct}% de las ventas de la empresa` : ""}
                  {faltaLider > 0 ? ` · te faltan ${formatCRC(faltaLider)} para el 1°` : a.rank === 1 ? " · ¡vas de líder! 🎉" : ""}
                </p>
              </div>
            </div>
          </section>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Mis facturas" value={String(a.count)} Icon={ShoppingBag} accent="brand" />
            <MetricCard label="Vendido (₡)" value={formatCRC(a.amountCRC)} Icon={Wallet} accent="accent" />
            <MetricCard label="Vendido ($)" value={a.amountUSD > 0 ? fmtUSD(a.amountUSD) : "$0.00"} Icon={DollarSign} accent="brand" />
            <MetricCard label="Ticket promedio" value={formatCRC(a.ticketPromedioCRC)} Icon={Receipt} accent="warn" />
          </div>

          {/* Ventas por día */}
          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
              <TrendingUp className="size-4 text-brand-600" /> Tus ventas por día (₡)
            </h2>
            <DayBars data={a.porDia.map((d) => ({ day: d.day, value: d.crc }))} fmt={formatCRC} />
          </section>

          {/* Evolución por mes */}
          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
              <TrendingUp className="size-4 text-brand-600" /> Evolución (últimos 6 meses)
            </h2>
            <BarList items={evoItems} accent="brand" rank={false} emptyText="Sin historial todavía" />
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Por sucursal */}
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
                <Building2 className="size-4 text-brand-600" /> Por sucursal
              </h2>
              <BarList items={sucItems} accent="accent" rank={false} />
            </section>

            {/* Estado */}
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
                <PieChart className="size-4 text-brand-600" /> Aceptadas vs rechazadas
              </h2>
              <SplitBar segments={[
                { label: "Aceptadas", value: a.aceptadas, color: "bg-accent-500" },
                { label: "Rechazadas", value: a.rechazadas, color: "bg-red-400" },
              ]} />
              <p className="mt-4 text-xs text-ink-500">
                {firstName ? `${firstName}, ` : ""}mantené tus facturas aceptadas para que cuenten a tu favor.
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
