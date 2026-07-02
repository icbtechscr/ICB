// Metricas del colaborador para el portal. Las ventas salen de CPI (tabla
// cpi_sales, sincronizada). Puntualidad/asistencia quedan pendientes (TODO:
// calcular desde el marcaje) y por ahora se muestran como "—".
import { getMonthlySalesForUser } from "@/lib/cpi-sales";

export type PortalMetrics = {
  salesCount: number | null;
  salesAmountCRC: number | null;
  salesAmountUSD: number | null;
  punctualityPct: number | null;
  attendancePct: number | null;
  publications: number | null;
};

export const EMPTY_METRICS: PortalMetrics = {
  salesCount: null,
  salesAmountCRC: null,
  salesAmountUSD: null,
  punctualityPct: null,
  attendancePct: null,
  publications: null,
};

/** Año y mes (1-12) actuales en hora de Costa Rica. */
export function crYearMonth(now: Date = new Date()): { year: number; month1: number } {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
  }).format(now); // YYYY-MM
  const [y, m] = s.split("-").map(Number);
  return { year: y, month1: m };
}

/** Resumen de metricas del mes en curso para un colaborador. */
export async function getMyMonthlyMetrics(userId: string): Promise<PortalMetrics> {
  try {
    const { year, month1 } = crYearMonth();
    const sales = await getMonthlySalesForUser(userId, year, month1);
    return {
      salesCount: sales.count,
      salesAmountCRC: sales.amountCRC,
      salesAmountUSD: sales.amountUSD,
      punctualityPct: null,
      attendancePct: null,
      publications: null,
    };
  } catch {
    // Sin CPI configurado / tablas aun no creadas: mostramos vacio.
    return { ...EMPTY_METRICS };
  }
}

/** Etiqueta del mes en curso, p. ej. "julio 2026". */
export function currentMonthLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Costa_Rica",
  }).format(now);
}

/** Formatea un porcentaje o "—" si es nulo. */
export function fmtPct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v)}%`;
}
