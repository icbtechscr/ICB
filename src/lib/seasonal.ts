// Temporadas del sitio. Se calculan con la fecha de Costa Rica para que el
// adorno entre y salga el dia correcto sin importar donde corra el servidor.

function crParts(ref: Date): { y: number; m: number; d: number } {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ref);
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

/**
 * Mes de la Patria en Costa Rica: todo septiembre, alrededor de la celebracion
 * de la Independencia del 15 de septiembre. Se repite todos los anos sola.
 */
export function isPatrioticMonthSeason(ref: Date = new Date()): boolean {
  // Para ver el adorno fuera de fecha: SEASON_OVERRIDE=patriotic-month (o
  // "off" para apagarlo). "mothers-day" se conserva como alias temporal para
  // que una configuracion anterior de Vercel muestre de inmediato el adorno
  // nuevo en vez de desactivarlo.
  const override = (process.env.SEASON_OVERRIDE || "").trim().toLowerCase();
  if (["patriotic-month", "patria", "mothers-day"].includes(override)) return true;
  if (override === "off") return false;
  if (["halloween", "terror", "christmas", "navidad"].includes(override)) return false;

  const { m } = crParts(ref);
  return m === 9;
}

export function isHalloweenSeason(ref: Date = new Date()): boolean {
  const override = (process.env.SEASON_OVERRIDE || "").trim().toLowerCase();
  if (["halloween", "terror"].includes(override)) return true;
  if (["off", "patriotic-month", "patria", "mothers-day", "christmas", "navidad"].includes(override)) return false;
  return crParts(ref).m === 10;
}

export function isChristmasSeason(ref: Date = new Date()): boolean {
  const override = (process.env.SEASON_OVERRIDE || "").trim().toLowerCase();
  if (["christmas", "navidad"].includes(override)) return true;
  if (["off", "halloween", "terror", "patriotic-month", "patria", "mothers-day"].includes(override)) return false;
  const {m,d}=crParts(ref);
  return m===11 || m===12 || (m===1 && d<=6);
}
export type SiteSeason = "patriotic-month" | "halloween" | "christmas" | null;

export function getSiteSeason(ref: Date = new Date()): SiteSeason {
  if (isChristmasSeason(ref)) return "christmas";
  if (isHalloweenSeason(ref)) return "halloween";
  return isPatrioticMonthSeason(ref) ? "patriotic-month" : null;
}
