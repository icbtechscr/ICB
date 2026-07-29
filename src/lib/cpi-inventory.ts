// Lectura del inventario de CPI guardado en Supabase. SOLO servidor.
import { createAdminClient } from "@/lib/supabase";

export type InventoryRow = {
  sucursal_code: string;
  sucursal: string;
  sku: string;
  descripcion: string;
  stock_qty: number;
};

export type InventorySucursal = {
  code: string;
  label: string;
  items: number;
  /** Productos con existencias > 0 (el dato util: el catalogo se lista completo). */
  conStock: number;
};

export type InventoryView = {
  sucursales: InventorySucursal[];
  rows: InventoryRow[];
  totalItems: number;
  totalUnits: number;
  syncedAt: string | null;
};

/** Inventario de una sucursal (o de todas si no se pasa codigo). */
export async function getCpiInventory(sucursalCode?: string): Promise<InventoryView> {
  const empty: InventoryView = {
    sucursales: [],
    rows: [],
    totalItems: 0,
    totalUnits: 0,
    syncedAt: null,
  };
  try {
    const sb = createAdminClient();

    // Sucursales disponibles (con su conteo). Se pagina porque Supabase
    // limita cada consulta a 1000 filas.
    const page = 1000;
    const all: {
      sucursal_code: string;
      sucursal: string;
      stock_qty: number;
      synced_at: string;
    }[] = [];
    for (let from = 0; from < 200000; from += page) {
      const { data, error } = await sb
        .from("cpi_inventory")
        .select("sucursal_code, sucursal, stock_qty, synced_at")
        .range(from, from + page - 1);
      if (error) break;
      const chunk = (data ?? []) as typeof all;
      all.push(...chunk);
      if (chunk.length < page) break;
    }
    const bySuc = new Map<string, InventorySucursal>();
    let syncedAt: string | null = null;
    for (const r of all) {
      const s = bySuc.get(r.sucursal_code) ?? {
        code: r.sucursal_code,
        label: r.sucursal || "Sin sucursal",
        items: 0,
        conStock: 0,
      };
      s.items += 1;
      if ((Number(r.stock_qty) || 0) > 0) s.conStock += 1;
      bySuc.set(r.sucursal_code, s);
      if (!syncedAt || r.synced_at > syncedAt) syncedAt = r.synced_at;
    }
    const sucursales = [...bySuc.values()].sort((a, b) => a.label.localeCompare(b.label));
    if (sucursales.length === 0) return empty;

    const code = sucursalCode ?? sucursales[0].code;
    const rows: InventoryRow[] = [];
    for (let from = 0; from < 200000; from += page) {
      const { data, error } = await sb
        .from("cpi_inventory")
        .select("sucursal_code, sucursal, sku, descripcion, stock_qty")
        .eq("sucursal_code", code)
        .order("descripcion")
        .range(from, from + page - 1);
      if (error) break;
      const chunk = (data ?? []) as InventoryRow[];
      rows.push(...chunk);
      if (chunk.length < page) break;
    }

    return {
      sucursales,
      rows,
      totalItems: rows.length,
      totalUnits: rows.reduce((s, r) => s + (Number(r.stock_qty) || 0), 0),
      syncedAt,
    };
  } catch {
    return empty;
  }
}
