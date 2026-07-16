import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CRC = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

export function formatCRC(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseInt(value, 10) : value ?? 0;
  if (!n || Number.isNaN(n)) return "Consultar precio";
  return CRC.format(n);
}

export function decodeHtml(s: string | null | undefined): string {
  if (!s) return "";
  const namedEntities: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
    aacute: "á",
    eacute: "é",
    iacute: "í",
    oacute: "ó",
    uacute: "ú",
    Aacute: "Á",
    Eacute: "É",
    Iacute: "Í",
    Oacute: "Ó",
    Uacute: "Ú",
    ntilde: "ñ",
    Ntilde: "Ñ",
    uuml: "ü",
    Uuml: "Ü",
    copy: "©",
    reg: "®",
    trade: "™",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    laquo: "«",
    raquo: "»",
  };

  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);?/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    )
    .replace(/&([a-zA-Z]+);/g, (entity, name: string) =>
      Object.hasOwn(namedEntities, name) ? namedEntities[name] : entity
    );
}

export function stripHtml(s: string | null | undefined): string {
  return decodeHtml(s).replace(/<[^>]+>/g, "").trim();
}
