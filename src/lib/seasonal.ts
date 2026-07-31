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
 * Dia de la Madre en Costa Rica: 15 de agosto.
 * La decoracion se muestra del 1 al 16 de agosto (un dia despues, para que no
 * se caiga a medianoche del mismo dia), y se repite todos los anos sola.
 */
export function isMothersDaySeason(ref: Date = new Date()): boolean {
  // Para ver el adorno fuera de fecha: SEASON_OVERRIDE=mothers-day (o "off"
  // para apagarlo). Sirve en .env.local o como variable en Vercel.
  const override = (process.env.SEASON_OVERRIDE || "").trim().toLowerCase();
  if (override === "mothers-day") return true;
  if (override === "off") return false;

  const { m, d } = crParts(ref);
  return m === 8 && d >= 1 && d <= 16;
}
