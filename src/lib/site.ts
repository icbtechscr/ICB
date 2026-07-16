// URL pública canónica. El dominio con www es el que sirve el sitio sin redirección.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.icbtechscr.com"
).replace(/\/$/, "");

export const SITE_NAME = "ICB Tech";

export const SITE_DESCRIPTION =
  "Computadoras, cámaras de seguridad, redes, periféricos y POS. Distribuidor oficial Dahua, Hikvision y Uniview en Costa Rica.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_LOGO_URL = absoluteUrl("/favicon-192.png");
export const SITE_OG_IMAGE_URL = absoluteUrl("/og-icb.png");
