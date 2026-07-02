// Métricas del colaborador (ventas, puntualidad, etc.) para el portal.
//
// TODO: conectar con las fuentes reales:
//   - Ventas: pedidos/ventas atribuidas al colaborador.
//   - Puntualidad/asistencia: calcular desde el marcaje (src/lib/timeclock-*).
//   - Publicaciones: desde el panel de vendedor (src/lib/vendor).
// Por ahora devolvemos valores nulos ("—" en la interfaz) hasta definir el
// modelo de datos. Toda la lógica vive aquí para wire-up en un solo lugar.

export type PortalMetrics = {
  /** Cantidad de ventas del mes en curso. */
  salesCount: number | null;
  /** Monto vendido en el mes (CRC). */
  salesAmountCRC: number | null;
  /** Puntualidad del mes (0–100). */
  punctualityPct: number | null;
  /** Asistencia del mes (0–100). */
  attendancePct: number | null;
  /** Publicaciones hechas en el mes. */
  publications: number | null;
};

export const EMPTY_METRICS: PortalMetrics = {
  salesCount: null,
  salesAmountCRC: null,
  punctualityPct: null,
  attendancePct: null,
  publications: null,
};

/** Resumen de métricas del mes para un colaborador. Placeholder por ahora. */
export async function getMyMonthlyMetrics(
  _userId: string
): Promise<PortalMetrics> {
  // TODO: reemplazar con consultas reales.
  return { ...EMPTY_METRICS };
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
