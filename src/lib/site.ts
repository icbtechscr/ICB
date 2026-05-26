// URL pública del sitio. Configurar NEXT_PUBLIC_SITE_URL en Vercel
// con el dominio final (ej. https://icbtechscr.com).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://icbtechscr.com"
).replace(/\/$/, "");

export const SITE_NAME = "ICB Tech";

export const SITE_DESCRIPTION =
  "Computadoras, cámaras de seguridad, redes, periféricos y POS. Distribuidor oficial Dahua, Hikvision y Uniview en Costa Rica.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
