import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeDollarSign,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Medal,
  PackageSearch,
  PieChart,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  Trophy,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserFullName } from "@/lib/roles";
import { crYearMonth } from "@/lib/portal-metrics";
import {
  getUserSalesAnalytics,
  getUserMonthlyEvolution,
  getVendorPerformance as getSalesVendorPerformance,
} from "@/lib/cpi-analytics";
import {
  getQuoteVendorPerformance,
  getUserQuoteAnalytics,
  getUserQuoteMonthlyEvolution,
} from "@/lib/cpi-quotes";
import { getVendorsForUser } from "@/lib/cpi-sales";
import { formatCRC } from "@/lib/utils";
import { MetricCard } from "@/components/portal/MetricCard";
import { BarList, DayBars, SplitBar, type BarItem } from "@/components/admin/SalesCharts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rendimiento" };

const CRC_ZERO = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

function fmtCRC(n: number) {
  return CRC_ZERO.format(Math.round(n || 0));
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function money(crc: number, usd: number) {
  return usd > 0 ? `${fmtCRC(crc)} / ${fmtUSD(usd)}` : fmtCRC(crc);
}

function monthLabel(y: number, m: number) {
  return new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function shift(y: number, m: number, d: number) {
  const x = new Date(y, m - 1 + d, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

function ym(year: number, month1: number) {
  return `${year}-${String(month1).padStart(2, "0")}`;
}

function hrefFor(view: "ventas" | "cotizaciones", year: number, month1: number) {
  return `?vista=${view}&mes=${ym(year, month1)}`;
}

function monthHref(view: "ventas" | "cotizaciones", year: number, month1: number, delta: number) {
  return `?vista=${view}&mes=${shift(year, month1, delta)}`;
}

function medalClass(r: number): string {
  if (r === 1) return "bg-gradient-to-br from-amber-300 to-amber-500 text-white ring-2 ring-amber-200";
  if (r === 2) return "bg-gradient-to-br from-slate-300 to-slate-400 text-white";
  if (r === 3) return "bg-gradient-to-br from-orange-400 to-amber-700 text-white";
  return "bg-ink-100 text-ink-500";
}

function ViewTabs({
  activeView,
  year,
  month1,
}: {
  activeView: "ventas" | "cotizaciones";
  year: number;
  month1: number;
}) {
  return (
    <div className="mb-5 inline-flex rounded-full border border-ink-200 bg-white p-1">
      <Link
        href={hrefFor("ventas", year, month1)}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${
          activeView === "ventas" ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-100"
        }`}
      >
        <ShoppingBag className="size-4" />
        Ventas
      </Link>
      <Link
        href={hrefFor("cotizaciones", year, month1)}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${
          activeView === "cotizaciones" ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-100"
        }`}
      >
        <ClipboardList className="size-4" />
        Cotizaciones
      </Link>
    </div>
  );
}

function PageHeader({
  activeView,
  year,
  month1,
}: {
  activeView: "ventas" | "cotizaciones";
  year: number;
  month1: number;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-900">Rendimiento</h1>
        <p className="mt-1 text-sm text-ink-600">
          Tus ventas, cotizaciones y posicion del mes.
        </p>
      </div>
      <div className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1">
        <Link
          href={monthHref(activeView, year, month1, -1)}
          className="inline-flex size-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-32 px-2 text-center text-sm font-bold capitalize text-ink-900">
          {monthLabel(year, month1)}
        </span>
        <Link
          href={monthHref(activeView, year, month1, 1)}
          className="inline-flex size-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

async function SalesPerformance({
  userId,
  firstName,
  year,
  month1,
  myVendors,
}: {
  userId: string;
  firstName: string;
  year: number;
  month1: number;
  myVendors: Set<string>;
}) {
  const [a, evo, perf] = await Promise.all([
    getUserSalesAnalytics(userId, year, month1),
    getUserMonthlyEvolution(userId, 6),
    getSalesVendorPerformance(year, month1),
  ]);
  const evoItems: BarItem[] = evo.map((p) => ({
    label: p.label,
    value: p.crc,
    display: formatCRC(p.crc),
    sub: `${p.count} factura(s)`,
  }));
  const sucItems: BarItem[] = a.porSucursal.map((b) => ({
    label: b.key,
    value: b.crc + b.usd * 520,
    display: b.usd > 0 ? `${formatCRC(b.crc)} / ${fmtUSD(b.usd)}` : formatCRC(b.crc),
    sub: `${b.count} factura(s)`,
  }));
  const faltaLider = a.rank && a.rank > 1 ? a.leaderValor - a.myValor : 0;

  return (
    <>
      {!a.hasData ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-soft">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><TrendingUp className="size-7" /></span>
          <h2 className="mt-4 text-lg font-black text-ink-900">Sin ventas este mes</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-600">
            No hay facturas tuyas en {monthLabel(year, month1)}. Si crees que es un error,
            puede ser que tu nombre de vendedor no este enlazado; avisa a RRHH.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lift">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_85%_-10%,rgba(255,255,255,0.35),transparent_50%)]" />
            <div className="relative flex items-center gap-4">
              <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
                <Trophy className="size-8" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Tu posicion en ventas</p>
                <p className="text-3xl font-black leading-tight">
                  {a.rank ? `#${a.rank}` : "-"}
                  <span className="ml-2 text-sm font-semibold text-white/70">de {a.totalVendedores} vendedores</span>
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {a.sharePct != null ? `Aportas el ${a.sharePct}% de las ventas de la empresa` : ""}
                  {faltaLider > 0 ? ` / te faltan ${formatCRC(faltaLider)} para el 1ro` : a.rank === 1 ? " / vas de lider" : ""}
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Mis facturas" value={String(a.count)} Icon={ShoppingBag} accent="brand" />
            <MetricCard label="Vendido (CRC)" value={formatCRC(a.amountCRC)} Icon={Wallet} accent="accent" />
            <MetricCard label="Vendido (USD)" value={a.amountUSD > 0 ? fmtUSD(a.amountUSD) : "$0.00"} Icon={DollarSign} accent="brand" />
            <MetricCard label="Ticket promedio" value={formatCRC(a.ticketPromedioCRC)} Icon={Receipt} accent="warn" />
          </div>

          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
              <TrendingUp className="size-4 text-brand-600" /> Tus ventas por dia (CRC)
            </h2>
            <DayBars data={a.porDia.map((d) => ({ day: d.day, value: d.crc }))} fmt={formatCRC} />
          </section>

          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
              <TrendingUp className="size-4 text-brand-600" /> Evolucion de ventas
            </h2>
            <BarList items={evoItems} accent="brand" rank={false} emptyText="Sin historial todavia" />
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
                <Building2 className="size-4 text-brand-600" /> Por sucursal
              </h2>
              <BarList items={sucItems} accent="accent" rank={false} />
            </section>

            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
                <PieChart className="size-4 text-brand-600" /> Aceptadas vs rechazadas
              </h2>
              <SplitBar segments={[
                { label: "Aceptadas", value: a.aceptadas, color: "bg-accent-500" },
                { label: "Rechazadas", value: a.rechazadas, color: "bg-red-400" },
              ]} />
              <p className="mt-4 text-xs text-ink-500">
                {firstName ? `${firstName}, ` : ""}manten tus facturas aceptadas para que cuenten a tu favor.
              </p>
            </section>
          </div>
        </div>
      )}

      {perf.hasData && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
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
    </>
  );
}

async function QuotePerformance({
  userId,
  firstName,
  year,
  month1,
  myVendors,
}: {
  userId: string;
  firstName: string;
  year: number;
  month1: number;
  myVendors: Set<string>;
}) {
  const [q, evo, perf] = await Promise.all([
    getUserQuoteAnalytics(userId, year, month1),
    getUserQuoteMonthlyEvolution(userId, 6),
    getQuoteVendorPerformance(year, month1),
  ]);
  const evoItems: BarItem[] = evo.map((p) => ({
    label: p.label,
    value: p.count,
    display: `${p.count} COTs`,
    sub: fmtCRC(p.crc),
  }));
  const sucItems: BarItem[] = q.porSucursal.map((b) => ({
    label: b.key,
    value: b.count,
    display: `${b.count} COTs`,
    sub: money(b.crc, b.usd),
  }));
  const productItems: BarItem[] = q.topProducts.map((product) => ({
    label: product.descripcion,
    value: product.quoteCount,
    display: String(product.quoteCount),
    sub: product.sku
      ? `${product.sku} / ${product.cantidad.toLocaleString("es-CR", { maximumFractionDigits: 2 })} unidades`
      : `${product.cantidad.toLocaleString("es-CR", { maximumFractionDigits: 2 })} unidades`,
  }));
  const leader = perf.vendors[0];
  const cotGap = Math.max(0, (leader?.count ?? q.leaderCount) - q.count);
  const valueGap = Math.max(0, (leader?.valor ?? q.leaderValor) - q.myValor);

  return (
    <>
      {!q.hasData ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-soft">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <PackageSearch className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-black text-ink-900">Sin cotizaciones este mes</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-600">
            Cuando se sincronice CPI, tus COTs de {monthLabel(year, month1)} apareceran aqui.
            Si ya hiciste cotizaciones, puede faltar enlazar tu vendedor con el portal.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-700 via-brand-600 to-ink-900 p-6 text-white shadow-lift">
            <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_85%_-10%,rgba(255,255,255,0.35),transparent_50%)]" />
            <div className="relative flex items-center gap-4">
              <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
                <ClipboardList className="size-8" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Tu posicion en cotizaciones</p>
                <p className="text-3xl font-black leading-tight">
                  {q.rank ? `#${q.rank}` : "-"}
                  <span className="ml-2 text-sm font-semibold text-white/70">de {q.totalVendedores} vendedores</span>
                </p>
                <p className="mt-0.5 text-sm text-white/80">
                  {q.sharePct != null ? `Aportas el ${q.sharePct}% de las COTs enlazadas` : ""}
                  {cotGap > 0 ? ` / te faltan ${cotGap} COTs para el lider` : q.rank === 1 ? " / vas de lider" : ""}
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Mis COTs" value={String(q.count)} Icon={ClipboardList} accent="brand" />
            <MetricCard label="Cotizado (CRC)" value={fmtCRC(q.amountCRC)} Icon={Wallet} accent="accent" />
            <MetricCard label="Cotizado (USD)" value={q.amountUSD > 0 ? fmtUSD(q.amountUSD) : "$0.00"} Icon={DollarSign} accent="brand" />
            <MetricCard label="Ticket promedio" value={fmtCRC(q.ticketPromedioCRC)} Icon={Receipt} accent="warn" />
            <MetricCard label="Clientes" value={String(q.clientes)} Icon={Users} accent="brand" />
            <MetricCard label="Productos" value={String(q.productos)} Icon={ShoppingBasket} accent="accent" />
            <MetricCard label="Lineas" value={String(q.lineas)} Icon={Receipt} accent="brand" />
            <MetricCard label="Dias activos" value={String(q.activeDays)} Icon={TrendingUp} accent="warn" />
          </div>

          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
              <TrendingUp className="size-4 text-brand-600" /> Tus cotizaciones por dia
            </h2>
            <DayBars
              data={q.porDia.map((d) => ({ day: d.day, value: d.count }))}
              fmt={(n) => `${n} COTs`}
            />
          </section>

          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
              <TrendingUp className="size-4 text-brand-600" /> Evolucion de cotizaciones
            </h2>
            <BarList items={evoItems} accent="brand" rank={false} emptyText="Sin historial todavia" />
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
                <Building2 className="size-4 text-brand-600" /> COTs por sucursal
              </h2>
              <BarList items={sucItems} accent="accent" rank={false} />
            </section>

            <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
                <ShoppingBasket className="size-4 text-brand-600" /> Tus productos mas cotizados
              </h2>
              <BarList items={productItems} accent="warn" />
            </section>
          </div>

          {perf.hasData && (
            <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
              <h2 className="flex items-center gap-2 border-b border-ink-100 px-5 py-3.5 text-sm font-bold text-ink-900">
                <Medal className="size-4 text-brand-600" /> Ranking de cotizaciones
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
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-black text-ink-900">{v.count} COTs</span>
                        <span className="block text-[11px] font-semibold text-ink-400">{money(v.crc, v.usd)}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-900">
              <BadgeDollarSign className="size-4 text-brand-600" /> Lider de cotizaciones y comparacion
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                <p className="text-xs font-bold uppercase text-ink-400">Lider</p>
                <p className="mt-1 truncate text-sm font-black text-ink-900" title={leader?.vendedor || q.leaderName}>
                  {leader?.vendedor || q.leaderName || "-"}
                </p>
                <p className="mt-2 text-2xl font-black text-ink-900">{leader?.count ?? q.leaderCount}</p>
                <p className="text-xs font-semibold text-ink-500">COTs en el mes</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
                <p className="text-xs font-bold uppercase text-brand-500">Vos</p>
                <p className="mt-1 truncate text-sm font-black text-ink-900">
                  {firstName || "Tu avance"}
                </p>
                <p className="mt-2 text-2xl font-black text-ink-900">{q.count}</p>
                <p className="text-xs font-semibold text-ink-500">{money(q.amountCRC, q.amountUSD)}</p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="text-xs font-bold uppercase text-ink-400">Diferencia</p>
                <p className="mt-1 text-sm font-black text-ink-900">
                  {cotGap > 0 ? `${cotGap} COTs` : "Estas arriba"}
                </p>
                <p className="mt-2 text-2xl font-black text-ink-900">{valueGap > 0 ? fmtCRC(valueGap) : fmtCRC(0)}</p>
                <p className="text-xs font-semibold text-ink-500">valor comparativo</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default async function RendimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  const sp = await searchParams;
  const activeView = sp.vista === "cotizaciones" ? "cotizaciones" : "ventas";
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

  const myVendors = new Set(await getVendorsForUser(user.id));
  const firstName = (getUserFullName(user) || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader activeView={activeView} year={year} month1={month1} />
      <ViewTabs activeView={activeView} year={year} month1={month1} />
      {activeView === "cotizaciones" ? (
        <QuotePerformance
          userId={user.id}
          firstName={firstName}
          year={year}
          month1={month1}
          myVendors={myVendors}
        />
      ) : (
        <SalesPerformance
          userId={user.id}
          firstName={firstName}
          year={year}
          month1={month1}
          myVendors={myVendors}
        />
      )}
    </div>
  );
}
