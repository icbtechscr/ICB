// Analitica de ventas (sobre cpi_sales) para el panel admin. SOLO servidor.
import { createAdminClient } from "@/lib/supabase";

export type Bucket = { key: string; count: number; crc: number; usd: number };

export type SalesAnalytics = {
  totalCRC: number;
  totalUSD: number;
  count: number;
  aceptadas: number;
  rechazadas: number;
  ticketPromedioCRC: number; // sobre facturas en colones
  vendedores: number;
  sucursales: number;
  porSucursal: Bucket[]; // origen (ciudad)
  porVendedor: Bucket[]; // ranking desc por crc
  porPuntoVenta: Bucket[];
  porTipo: Bucket[];
  porCliente: Bucket[];
  porDia: { day: string; crc: number; usd: number; count: number }[];
  prevMonthCRC: number;
  hasData: boolean;
};

type Row = {
  fecha: string | null;
  origen: string | null;
  sucursal: string | null;
  vendedor: string | null;
  moneda: string | null;
  subtotal: number | null;
  estado: string | null;
  tipo: string | null;
};

function monthRange(year: number, month1: number): { from: string; to: string; days: number } {
  const from = new Date(Date.UTC(year, month1 - 1, 1));
  const to = new Date(Date.UTC(year, month1, 1));
  const days = new Date(year, month1, 0).getDate();
  return { from: from.toISOString(), to: to.toISOString(), days };
}

function bump(map: Map<string, Bucket>, key: string, crc: number, usd: number) {
  const k = key || "—";
  const b = map.get(k) ?? { key: k, count: 0, crc: 0, usd: 0 };
  b.count += 1;
  b.crc += crc;
  b.usd += usd;
  map.set(k, b);
}

const bySortCrc = (a: Bucket, b: Bucket) => b.crc - a.crc || b.count - a.count;

async function fetchIgnored(): Promise<Set<string>> {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("cpi_vendor_map").select("cpi_vendor, ignored").eq("ignored", true);
    return new Set((data ?? []).map((r: { cpi_vendor: string }) => r.cpi_vendor));
  } catch {
    return new Set();
  }
}

export async function getSalesAnalytics(
  year: number,
  month1: number
): Promise<SalesAnalytics> {
  const empty: SalesAnalytics = {
    totalCRC: 0, totalUSD: 0, count: 0, aceptadas: 0, rechazadas: 0,
    ticketPromedioCRC: 0, vendedores: 0, sucursales: 0,
    porSucursal: [], porVendedor: [], porPuntoVenta: [], porTipo: [], porCliente: [],
    porDia: [], prevMonthCRC: 0, hasData: false,
  };

  let rows: Row[] = [];
  try {
    const sb = createAdminClient();
    const { from, to } = monthRange(year, month1);
    const { data } = await sb
      .from("cpi_sales")
      .select("fecha, origen, sucursal, vendedor, moneda, subtotal, estado, tipo")
      .gte("fecha", from)
      .lt("fecha", to)
      .limit(20000);
    rows = (data ?? []) as Row[];
  } catch {
    return empty;
  }
  if (rows.length === 0) return empty;

  const ignored = await fetchIgnored();
  const { days } = monthRange(year, month1);
  const suc = new Map<string, Bucket>();
  const ven = new Map<string, Bucket>();
  const pv = new Map<string, Bucket>();
  const tipo = new Map<string, Bucket>();
  const cli = new Map<string, Bucket>();
  const dia = new Map<string, { day: string; crc: number; usd: number; count: number }>();

  let totalCRC = 0, totalUSD = 0, aceptadas = 0, rechazadas = 0;
  let crcCount = 0;

  for (const r of rows) {
    const val = Number(r.subtotal) || 0;
    const isUSD = r.moneda === "USD";
    const crc = isUSD ? 0 : val;
    const usd = isUSD ? val : 0;
    totalCRC += crc;
    totalUSD += usd;
    if (!isUSD) crcCount += 1;
    if ((r.estado || "").toUpperCase() === "ACEPTADA") aceptadas += 1;
    else if ((r.estado || "").toUpperCase() === "RECHAZADA") rechazadas += 1;

    bump(suc, r.origen || "—", crc, usd);
    if (!ignored.has(r.vendedor || "—")) bump(ven, r.vendedor || "—", crc, usd);
    bump(pv, r.sucursal || "—", crc, usd);
    bump(tipo, r.tipo || "Factura", crc, usd);
    if (r.cliente) bump(cli, r.cliente, crc, usd);

    const dkey = (r.fecha || "").slice(0, 10);
    if (dkey) {
      const d = dia.get(dkey) ?? { day: dkey, crc: 0, usd: 0, count: 0 };
      d.crc += crc; d.usd += usd; d.count += 1;
      dia.set(dkey, d);
    }
  }

  // Serie diaria completa del mes (rellena días sin ventas con 0).
  const porDia: SalesAnalytics["porDia"] = [];
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    porDia.push(dia.get(key) ?? { day: key, crc: 0, usd: 0, count: 0 });
  }

  // Total del mes anterior (para el crecimiento).
  let prevMonthCRC = 0;
  try {
    const sb = createAdminClient();
    const pm = month1 === 1 ? { y: year - 1, m: 12 } : { y: year, m: month1 - 1 };
    const pr = monthRange(pm.y, pm.m);
    const { data } = await sb.from("cpi_sales").select("moneda, subtotal").gte("fecha", pr.from).lt("fecha", pr.to).limit(50000);
    for (const r of (data ?? []) as { moneda: string; subtotal: number }[]) {
      if (r.moneda !== "USD") prevMonthCRC += Number(r.subtotal) || 0;
    }
  } catch { /* ignore */ }

  return {
    totalCRC, totalUSD, count: rows.length, aceptadas, rechazadas,
    ticketPromedioCRC: crcCount ? Math.round(totalCRC / crcCount) : 0,
    vendedores: ven.size,
    sucursales: suc.size,
    porSucursal: [...suc.values()].sort(bySortCrc),
    porVendedor: [...ven.values()].sort(bySortCrc),
    porPuntoVenta: [...pv.values()].sort(bySortCrc),
    porTipo: [...tipo.values()].sort((a, b) => b.count - a.count),
    porCliente: [...cli.values()].sort(bySortCrc).slice(0, 10),
    porDia,
    prevMonthCRC,
    hasData: true,
  };
}

// --- Analitica por vendedor (portal del colaborador) ---

export type UserSalesAnalytics = {
  count: number;
  amountCRC: number;
  amountUSD: number;
  ticketPromedioCRC: number;
  aceptadas: number;
  rechazadas: number;
  porDia: { day: string; crc: number }[];
  porSucursal: Bucket[];
  // Ranking (por "valor" = CRC + USD*520, un proxy para ordenar mezclando moneda)
  rank: number | null;
  totalVendedores: number;
  sharePct: number | null; // % del total de la empresa
  myValor: number;
  leaderValor: number;
  hasData: boolean;
};

const USD_RATE = 520; // solo para ordenar el ranking mezclando monedas

export async function getUserSalesAnalytics(
  userId: string,
  year: number,
  month1: number
): Promise<UserSalesAnalytics> {
  const empty: UserSalesAnalytics = {
    count: 0, amountCRC: 0, amountUSD: 0, ticketPromedioCRC: 0,
    aceptadas: 0, rechazadas: 0, porDia: [], porSucursal: [],
    rank: null, totalVendedores: 0, sharePct: null, myValor: 0, leaderValor: 0,
    hasData: false,
  };
  let rows: (Row & { user_id: string | null })[] = [];
  try {
    const sb = createAdminClient();
    const { from, to } = monthRange(year, month1);
    const { data } = await sb
      .from("cpi_sales")
      .select("fecha, origen, sucursal, vendedor, moneda, subtotal, estado, tipo, user_id")
      .gte("fecha", from)
      .lt("fecha", to)
      .limit(50000);
    rows = (data ?? []) as (Row & { user_id: string | null })[];
  } catch {
    return empty;
  }
  if (rows.length === 0) return empty;

  const ignored = await fetchIgnored();
  const { days } = monthRange(year, month1);
  // Valor por vendedor (para ranking) — solo filas con user_id y no excluidas.
  const valorByUser = new Map<string, number>();
  for (const r of rows) {
    if (!r.user_id) continue;
    if (ignored.has(r.vendedor || "")) continue;
    const v = Number(r.subtotal) || 0;
    const valor = r.moneda === "USD" ? v * USD_RATE : v;
    valorByUser.set(r.user_id, (valorByUser.get(r.user_id) ?? 0) + valor);
  }
  const ranking = [...valorByUser.entries()].sort((a, b) => b[1] - a[1]);
  const totalVendedores = ranking.length;
  const companyValor = ranking.reduce((s, [, v]) => s + v, 0);
  const leaderValor = ranking[0]?.[1] ?? 0;
  const myValor = valorByUser.get(userId) ?? 0;
  const rankIdx = ranking.findIndex(([id]) => id === userId);
  const rank = rankIdx >= 0 ? rankIdx + 1 : null;

  // Metricas propias.
  const mine = rows.filter((r) => r.user_id === userId);
  let amountCRC = 0, amountUSD = 0, aceptadas = 0, rechazadas = 0, crcCount = 0;
  const suc = new Map<string, Bucket>();
  const dia = new Map<string, number>();
  for (const r of mine) {
    const v = Number(r.subtotal) || 0;
    const isUSD = r.moneda === "USD";
    if (isUSD) amountUSD += v; else { amountCRC += v; crcCount += 1; }
    const est = (r.estado || "").toUpperCase();
    if (est === "ACEPTADA") aceptadas += 1;
    else if (est === "RECHAZADA") rechazadas += 1;
    bump(suc, r.origen || "—", isUSD ? 0 : v, isUSD ? v : 0);
    const dk = (r.fecha || "").slice(0, 10);
    if (dk) dia.set(dk, (dia.get(dk) ?? 0) + (isUSD ? 0 : v));
  }
  const porDia: { day: string; crc: number }[] = [];
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    porDia.push({ day: key, crc: dia.get(key) ?? 0 });
  }

  return {
    count: mine.length, amountCRC, amountUSD,
    ticketPromedioCRC: crcCount ? Math.round(amountCRC / crcCount) : 0,
    aceptadas, rechazadas, porDia,
    porSucursal: [...suc.values()].sort(bySortCrc),
    rank, totalVendedores,
    sharePct: companyValor > 0 ? Math.round((myValor / companyValor) * 1000) / 10 : null,
    myValor, leaderValor,
    hasData: mine.length > 0,
  };
}

export type MonthPoint = { ym: string; label: string; crc: number; count: number };

/** Evolucion de los ultimos N meses (monto CRC) para un vendedor. */
export async function getUserMonthlyEvolution(
  userId: string,
  monthsBack = 6,
  now: Date = new Date()
): Promise<MonthPoint[]> {
  const points: MonthPoint[] = [];
  const base: { year: number; month1: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    base.push({ year: d.getFullYear(), month1: d.getMonth() + 1 });
  }
  try {
    const sb = createAdminClient();
    const from = new Date(Date.UTC(base[0].year, base[0].month1 - 1, 1)).toISOString();
    const { data } = await sb
      .from("cpi_sales")
      .select("fecha, moneda, subtotal")
      .eq("user_id", userId)
      .gte("fecha", from)
      .limit(50000);
    const byMonth = new Map<string, { crc: number; count: number }>();
    for (const r of (data ?? []) as { fecha: string | null; moneda: string; subtotal: number }[]) {
      const ym = (r.fecha || "").slice(0, 7);
      if (!ym) continue;
      const m = byMonth.get(ym) ?? { crc: 0, count: 0 };
      if (r.moneda !== "USD") m.crc += Number(r.subtotal) || 0;
      m.count += 1;
      byMonth.set(ym, m);
    }
    for (const b of base) {
      const ym = `${b.year}-${String(b.month1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("es-CR", { month: "short" }).format(new Date(b.year, b.month1 - 1, 1));
      const m = byMonth.get(ym) ?? { crc: 0, count: 0 };
      points.push({ ym, label, crc: m.crc, count: m.count });
    }
  } catch {
    return base.map((b) => ({
      ym: `${b.year}-${String(b.month1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("es-CR", { month: "short" }).format(new Date(b.year, b.month1 - 1, 1)),
      crc: 0, count: 0,
    }));
  }
  return points;
}

// --- Desempeño por vendedor (panel admin) ---

export type VendorPerf = {
  vendedor: string;
  count: number;
  crc: number;
  usd: number;
  aceptadas: number;
  rechazadas: number;
  ticketCRC: number;
  valor: number; // crc + usd*USD_RATE (para ordenar)
  sharePct: number;
  rank: number;
};

export type VendorPerformance = {
  vendors: VendorPerf[];
  totalCRC: number;
  totalUSD: number;
  count: number;
  companyValor: number;
  leaderValor: number;
  hasData: boolean;
};

export async function getVendorPerformance(
  year: number,
  month1: number
): Promise<VendorPerformance> {
  const empty: VendorPerformance = {
    vendors: [], totalCRC: 0, totalUSD: 0, count: 0,
    companyValor: 0, leaderValor: 0, hasData: false,
  };
  let rows: Row[] = [];
  try {
    const sb = createAdminClient();
    const { from, to } = monthRange(year, month1);
    const { data } = await sb
      .from("cpi_sales")
      .select("vendedor, moneda, subtotal, estado")
      .gte("fecha", from)
      .lt("fecha", to)
      .limit(50000);
    rows = (data ?? []) as Row[];
  } catch {
    return empty;
  }
  if (rows.length === 0) return empty;

  const ignored = await fetchIgnored();
  type Agg = { crc: number; usd: number; count: number; crcCount: number; aceptadas: number; rechazadas: number };
  const map = new Map<string, Agg>();
  let totalCRC = 0, totalUSD = 0, counted = 0;
  for (const r of rows) {
    const vend = r.vendedor || "—";
    if (ignored.has(vend)) continue;
    const v = Number(r.subtotal) || 0;
    const isUSD = r.moneda === "USD";
    totalCRC += isUSD ? 0 : v;
    totalUSD += isUSD ? v : 0;
    counted += 1;
    const a = map.get(vend) ?? { crc: 0, usd: 0, count: 0, crcCount: 0, aceptadas: 0, rechazadas: 0 };
    if (isUSD) a.usd += v; else { a.crc += v; a.crcCount += 1; }
    a.count += 1;
    const est = (r.estado || "").toUpperCase();
    if (est === "ACEPTADA") a.aceptadas += 1;
    else if (est === "RECHAZADA") a.rechazadas += 1;
    map.set(vend, a);
  }

  const list = [...map.entries()].map(([vendedor, a]) => ({
    vendedor, count: a.count, crc: a.crc, usd: a.usd,
    aceptadas: a.aceptadas, rechazadas: a.rechazadas,
    ticketCRC: a.crcCount ? Math.round(a.crc / a.crcCount) : 0,
    valor: a.crc + a.usd * USD_RATE,
  }));
  list.sort((x, y) => y.valor - x.valor);
  const companyValor = list.reduce((s, v) => s + v.valor, 0);
  const leaderValor = list[0]?.valor ?? 0;
  const vendors: VendorPerf[] = list.map((v, i) => ({
    ...v,
    rank: i + 1,
    sharePct: companyValor > 0 ? Math.round((v.valor / companyValor) * 1000) / 10 : 0,
  }));

  return {
    vendors, totalCRC, totalUSD, count: counted,
    companyValor, leaderValor, hasData: vendors.length > 0,
  };
}
