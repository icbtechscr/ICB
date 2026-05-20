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
  return s
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(s: string | null | undefined): string {
  return decodeHtml(s).replace(/<[^>]+>/g, "").trim();
}
