// Capa de servidor para ventas CPI: sincronizacion (upsert + mapeo vendedor->
// usuario) y consultas de metricas. SOLO servidor (usa el admin client).
import { createAdminClient } from "@/lib/supabase";
import { cpiGetCompletadas, normalizeName, type CpiInvoice } from "@/lib/cpi";

export type VendorMapRow = { cpi_vendor: string; user_id: string | null };

export type SaleRow = {
  cpi_key: string;
  tipo: string;
  factura: string;
  fecha: string | null;
  origen: string;
  sucursal: string;
  vendedor: string;
  cliente: string;
  moneda: string;
  subtotal: number;
  estado: string;
  user_id: string | null;
};

export type MonthlySales = {
  count: number;
  amountCRC: number;
  amountUSD: number;
};

function keyFor(inv: CpiInvoice): string {
  if (inv.clave) return inv.clave;
  return [inv.tipo, inv.vendedor, inv.fechaIso ?? "", inv.subtotal].join("|");
}

/** Resuelve el mapeo vendedor->usuario, auto-emparejando por nombre si falta. */
async function resolveVendorMap(): Promise<Map<string, string>> {
  const sb = createAdminClient();
  const { data: rows } = await sb
    .from("cpi_vendor_map")
    .select("cpi_vendor, user_id");
  const map = new Map<string, string>();
  const pending: string[] = [];
  for (const r of (rows ?? []) as VendorMapRow[]) {
    if (r.user_id) map.set(r.cpi_vendor, r.user_id);
    else pending.push(r.cpi_vendor);
  }
  if (pending.length === 0) return map;

  // Auto-match por nombre completo (normalizado) contra los usuarios.
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const byName = new Map<string, string>();
  for (const u of list?.users ?? []) {
    const full = (u.user_metadata?.full_name as string | undefined) ?? "";
    if (full) byName.set(normalizeName(full), u.id);
  }
  for (const vendor of pending) {
    const uid = byName.get(normalizeName(vendor));
    if (uid) {
      map.set(vendor, uid);
      // Persistir el match para no repetirlo.
      await sb
        .from("cpi_vendor_map")
        .update({ user_id: uid })
        .eq("cpi_vendor", vendor);
    }
  }
  return map;
}

export type SyncResult = {
  fetched: number;
  upserted: number;
  matchedVendors: number;
  error?: string;
};

/** Trae las facturas completadas de CPI y las guarda (upsert) en Supabase. */
export async function syncCpiSales(): Promise<SyncResult> {
  const sb = createAdminClient();
  const invoices = await cpiGetCompletadas();
  if (invoices.length === 0) {
    return { fetched: 0, upserted: 0, matchedVendors: 0 };
  }
  const vendorMap = await resolveVendorMap();

  const rows: SaleRow[] = invoices.map((inv) => ({
    cpi_key: keyFor(inv),
    tipo: inv.tipo,
    factura: inv.factura,
    fecha: inv.fechaIso,
    origen: inv.origen,
    sucursal: inv.sucursal,
    vendedor: inv.vendedor,
    cliente: inv.cliente,
    moneda: inv.moneda,
    subtotal: inv.subtotal,
    estado: inv.estado,
    user_id: vendorMap.get(inv.vendedor) ?? null,
  }));

  const { error, count } = await sb
    .from("cpi_sales")
    .upsert(rows, { onConflict: "cpi_key", count: "exact" });
  if (error) return { fetched: invoices.length, upserted: 0, matchedVendors: vendorMap.size, error: error.message };

  return {
    fetched: invoices.length,
    upserted: count ?? rows.length,
    matchedVendors: vendorMap.size,
  };
}

function monthRange(year: number, month1: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month1 - 1, 1));
  const to = new Date(Date.UTC(year, month1, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Agregado mensual de ventas para un usuario (por moneda). */
export async function getMonthlySalesForUser(
  userId: string,
  year: number,
  month1: number
): Promise<MonthlySales> {
  const sb = createAdminClient();
  const { from, to } = monthRange(year, month1);
  const { data } = await sb
    .from("cpi_sales")
    .select("moneda, subtotal")
    .eq("user_id", userId)
    .gte("fecha", from)
    .lt("fecha", to);
  let amountCRC = 0;
  let amountUSD = 0;
  const rows = (data ?? []) as { moneda: string; subtotal: number }[];
  for (const r of rows) {
    if (r.moneda === "USD") amountUSD += Number(r.subtotal) || 0;
    else amountCRC += Number(r.subtotal) || 0;
  }
  return { count: rows.length, amountCRC, amountUSD };
}

/** Facturas de un usuario en un rango (para el detalle de Ventas). */
export async function listSalesForUser(
  userId: string,
  opts: { year: number; month1: number; limit?: number }
): Promise<SaleRow[]> {
  const sb = createAdminClient();
  const { from, to } = monthRange(opts.year, opts.month1);
  const { data } = await sb
    .from("cpi_sales")
    .select("*")
    .eq("user_id", userId)
    .gte("fecha", from)
    .lt("fecha", to)
    .order("fecha", { ascending: false })
    .limit(opts.limit ?? 200);
  return (data ?? []) as SaleRow[];
}
