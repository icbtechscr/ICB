import { createAdminClient } from "@/lib/supabase";

export type CpiSalesStatus = {
  state: "fresh" | "stale" | "empty" | "unavailable";
  syncedAt: string | null;
  latestSaleAt: string | null;
};
export const SALES_STALE_AFTER_MS = 3 * 60 * 60 * 1000;

/** Consulta la copia local: nunca inicia sesión en CPI ni inventa ventas faltantes. */
export async function getCpiSalesStatus(now: Date = new Date()): Promise<CpiSalesStatus> {
  const unavailable: CpiSalesStatus = { state: "unavailable", syncedAt: null, latestSaleAt: null };
  try {
    const sb = createAdminClient();
    const [sync, latest] = await Promise.all([
      sb.from("cpi_sales").select("synced_at").order("synced_at", { ascending: false, nullsFirst: false }).limit(1).abortSignal(AbortSignal.timeout(5000)).maybeSingle(),
      sb.from("cpi_sales").select("fecha").order("fecha", { ascending: false, nullsFirst: false }).limit(1).abortSignal(AbortSignal.timeout(5000)).maybeSingle(),
    ]);
    if (sync.error || latest.error) return unavailable;
    if (!sync.data && !latest.data) return { state: "empty", syncedAt: null, latestSaleAt: null };
    const syncedAt = sync.data?.synced_at ?? null;
    const timestamp = syncedAt ? Date.parse(syncedAt) : NaN;
    const latestSaleAt = latest.data?.fecha ?? null;
    if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 5 * 60 * 1000) return unavailable;
    return { state: now.getTime() - timestamp > SALES_STALE_AFTER_MS ? "stale" : "fresh", syncedAt, latestSaleAt };
  } catch {
    return unavailable;
  }
}
