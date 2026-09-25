/** Elimina sesiones antiguas tanto del host actual como del dominio principal. */
export function clearSupabaseCookies() {
  const names = new Set(
    document.cookie
      .split(";")
      .map((cookie) => cookie.split("=")[0].trim())
      .filter((name) => name.startsWith("sb-"))
  );

  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; Path=/`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${window.location.hostname}`;
    if (
      window.location.hostname === "icbtechscr.com" ||
      window.location.hostname.endsWith(".icbtechscr.com")
    ) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=icbtechscr.com`;
    }
  }
}
