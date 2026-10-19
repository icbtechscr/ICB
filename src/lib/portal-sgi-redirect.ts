/** Redirecciones de interfaz únicamente: nunca mueve una API, pago o administración. */
export function retiredWorkerApi(pathname: string) {
  return pathname === "/api/timeclock/punch" || ["/api/portal/vacations", "/api/portal/avatar", "/api/push/subscribe", "/api/push/unsubscribe"].some(path => pathname === path || pathname.startsWith(`${path}/`));
}
export function portalSgiDestination(pathname: string, query: string) {
  const origin = "https://sgi.icbtechscr.com";
  const routes: Record<string, string> = { "/portal": "/", "/portal/marcar": "/mi-espacio/horario", "/marcar": "/mi-espacio/horario", "/portal/vacaciones": "/mi-espacio/vacaciones", "/portal/perfil": "/mi-espacio/perfil", "/portal/ventas": "/mi-espacio/ventas", "/portal/rendimiento": "/mi-espacio/rendimiento" };
  if (pathname === "/ingresar") {
    const login = new URL("/ingresar", origin), legacy = new URLSearchParams(query).get("next");
    if (legacy?.startsWith("/api/portal/sgi?")) {
      try {
        const requested = new URL(new URL(legacy, "https://icbtechscr.com").searchParams.get("next") || "/", origin);
        if (requested.origin === origin && !requested.pathname.startsWith("//")) login.searchParams.set("next", requested.pathname + requested.search);
      } catch { }
    }
    return login.toString();
  }
  if (!(pathname === "/portal" || pathname.startsWith("/portal/") || pathname === "/marcar" || pathname.startsWith("/marcar/") || pathname === "/vendedor" || pathname.startsWith("/vendedor/"))) return null;
  const destination = new URL(routes[pathname.replace(/\/$/, "")] || "/", origin);
  if (destination.pathname === "/mi-espacio/ventas") {
    const params = new URLSearchParams(query);
    for (const key of ["period", "ref"]) { const value = params.get(key); if (value && value.length <= 20) destination.searchParams.set(key, value); }
  }
  return destination.toString();
}
