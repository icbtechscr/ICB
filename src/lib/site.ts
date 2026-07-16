// URL pública canónica. El dominio con www es el que sirve el sitio sin redirección.
const configuredSiteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.icbtechscr.com"
).replace(/\/$/, "");

// Producción sirve el sitio en www. Normalizamos también una variable antigua
// sin www para impedir canonicals y sitemaps que apunten a una redirección.
export const SITE_URL = configuredSiteUrl.replace(
  /^https:\/\/icbtechscr\.com(?=\/|$)/i,
  "https://www.icbtechscr.com"
);

export const SITE_NAME = "ICB Technologies";

export const SITE_DESCRIPTION =
  "Computadoras, cámaras de seguridad, redes, periféricos y POS. Distribuidor oficial Dahua, Hikvision y Uniview en Costa Rica.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_LOGO_URL = absoluteUrl("/icb-favicon-192.png");
export const SITE_OG_IMAGE_URL = absoluteUrl("/og-icb.png");
