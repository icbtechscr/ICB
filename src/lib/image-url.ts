// Las copias de la BD conservan URLs absolutas. Solo los objetos PUBLICOS
// de los almacenes ICB conocidos se resuelven contra el entorno actual.
// Las URLs firmadas y los recursos de terceros nunca se reescriben.
const PREVIOUS_STORAGE_ORIGINS = new Set([
  "https://fnnzlkvohsaxwnmdymvc.supabase.co",
  "http://supabase-icb-pruebas.192.168.0.104.sslip.io",
]);

export function rewriteMediaUrl(
  value: string | null | undefined,
  storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
): string {
  const source = value?.trim() ?? "";
  if (!source || !storageUrl) return source;
  try {
    const url = new URL(source);
    const target = new URL(storageUrl);
    if (
      !PREVIOUS_STORAGE_ORIGINS.has(url.origin) ||
      url.username || url.password || target.username || target.password ||
      !["http:", "https:"].includes(target.protocol) ||
      !url.pathname.startsWith("/storage/v1/object/public/")
    ) return source;
    return `${target.origin}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return source;
  }
}
