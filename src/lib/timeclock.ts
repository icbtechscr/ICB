// Tipos, constantes y helpers de fecha del control de horario.
// Este módulo NO importa el cliente admin de Supabase, por lo que es seguro
// importarlo desde componentes cliente. Las consultas viven en timeclock-server.ts.

export type PunchType =
  | "entrada"
  | "salida_almuerzo"
  | "regreso_almuerzo"
  | "salida";

export const PUNCH_TYPES: PunchType[] = [
  "entrada",
  "salida_almuerzo",
  "regreso_almuerzo",
  "salida",
];

export const PUNCH_LABELS: Record<PunchType, string> = {
  entrada: "Marcar entrada",
  salida_almuerzo: "Salida a almuerzo",
  regreso_almuerzo: "Regreso de almuerzo",
  salida: "Marcar salida",
};

export const PUNCH_SHORT: Record<PunchType, string> = {
  entrada: "Entrada",
  salida_almuerzo: "Sale a almorzar",
  regreso_almuerzo: "Regresa de almuerzo",
  salida: "Salida",
};

export function isPunchType(v: unknown): v is PunchType {
  return typeof v === "string" && PUNCH_TYPES.includes(v as PunchType);
}

export type TimeEntry = {
  id: string;
  user_id: string;
  employee_name: string;
  branch_id: string | null;
  branch_name: string | null;
  punch_type: PunchType;
  punched_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
  within_range: boolean | null;
  created_at: string;
};

// --- Helpers de fechas en zona horaria de Costa Rica (UTC-6, sin DST) ---

const CR_OFFSET_MS = 6 * 60 * 60 * 1000;

/** "Hoy" en CR como YYYY-MM-DD. */
export function crTodayIso(now: Date = new Date()): string {
  const cr = new Date(now.getTime() - CR_OFFSET_MS);
  return cr.toISOString().slice(0, 10);
}

/** Rango UTC [start, end) para un día CR dado en formato YYYY-MM-DD. */
export function crDayRangeUtcFromIso(dayIso: string): {
  start: string;
  end: string;
} {
  // Medianoche CR = 06:00 UTC del mismo día.
  const start = new Date(`${dayIso}T00:00:00.000Z`).getTime() + CR_OFFSET_MS;
  const end = start + 24 * 60 * 60 * 1000;
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}
