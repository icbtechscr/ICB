// Las imágenes de productos se migran a Supabase Storage (ver
// scripts/migrate-images-to-supabase.mjs). Tras la migración, las URLs en la
// base de datos ya apuntan a Supabase, así que aquí no hay que reescribir nada.
//
// Se deja este helper como identidad por compatibilidad con los llamados
// existentes; si alguna URL quedara sin migrar, se respeta tal cual (sigue
// funcionando desde el host original mientras exista).

export function rewriteMediaUrl(url: string | null | undefined): string {
  return url ?? "";
}
