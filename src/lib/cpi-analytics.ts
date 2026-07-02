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
  porDia: { day: string; crc: number; usd: number; count: number }[];
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

export async function getSalesAnalytics(
  year: number,
  month1: number
): Promise<SalesAnalytics> {
  const empty: SalesAnalytics = {
    totalCRC: 0, totalUSD: 0, count: 0, aceptadas: 0, rechazadas: 0,
    ticketPromedioCRC: 0, vendedores: 0, sucursales: 0,
    porSucursal: [], porVendedor: [], porPuntoVenta: [], porTipo: [],
    porDia: [], hasData: false,
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

  const { days } = monthRange(year, month1);
  const suc = new Map<string, Bucket>();
  const ven = new Map<string, Bucket>();
  const pv = new Map<string, Bucket>();
  const tipo = new Map<string, Bucket>();
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
    bump(ven, r.vendedor || "—", crc, usd);
    bump(pv, r.sucursal || "—", crc, usd);
    bump(tipo, r.tipo || "Factura", crc, usd);

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

  return {
    totalCRC, totalUSD, count: rows.length, aceptadas, rechazadas,
    ticketPromedioCRC: crcCount ? Math.round(totalCRC / crcCount) : 0,
    vendedores: ven.size,
    sucursales: suc.size,
    porSucursal: [...suc.values()].sort(bySortCrc),
    porVendedor: [...ven.values()].sort(bySortCrc),
    porPuntoVenta: [...pv.values()].sort(bySortCrc),
    porTipo: [...tipo.values()].sort((a, b) => b.count - a.count),
    porDia,
    hasData: true,
  };
}
