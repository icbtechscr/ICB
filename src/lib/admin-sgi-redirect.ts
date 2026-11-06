/**
 * Retira únicamente las pantallas de administración de la tienda.
 * Los servicios privados que utiliza SGI conservan su autenticación.
 */
const ORIGIN = "https://sgi.icbtechscr.com";
const ROUTES: Record<string, string> = {
  "/admin": "/gestion",
  "/admin/login": "/ingresar",
  "/admin/productos": "/gestion/productos",
  "/admin/productos/nuevo": "/gestion/productos/nuevo",
  "/admin/pedidos": "/gestion/pedidos",
  "/admin/inventario-cpi": "/gestion/inventario-cpi",
  "/admin/cotizaciones": "/gestion/cotizaciones",
  "/admin/cotizaciones-vendedores": "/gestion/cotizaciones-vendedores",
  "/admin/colaboradores": "/gestion/colaboradores",
  "/admin/colaboradores/horario": "/gestion/colaboradores/horario",
  "/admin/colaboradores/historial": "/gestion/colaboradores/historial",
  "/admin/solicitudes": "/gestion/solicitudes",
  "/admin/equipo": "/gestion/equipo",
  "/admin/sgi-usuarios": "/gestion/sgi-usuarios",
  "/admin/ajustes": "/gestion/ajustes",
  "/admin/tienda": "/gestion/ajustes",
  "/admin/ventas-vendedores": "/gestion/ajustes",
  "/admin/ventas-sucursales": "/gestion/ventas-sucursales",
  "/admin/desempeno-vendedores": "/gestion/desempeno-vendedores",
  "/admin/analitica": "/gestion/analitica",
  "/admin/agente": "/gestion/agente",
  "/admin/auditoria": "/gestion/auditoria",
  "/admin/cronograma": "/gestion/cronograma",
};
export function adminSgiDestination(pathname: string, query = "") {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return null;
  const path = pathname.replace(/\/$/, "");
  const product = /^\/admin\/productos\/([a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i.exec(path);
  const destination = new URL(product ? "/gestion/productos/" + product[1] : ROUTES[path] || "/gestion", ORIGIN);
  // Solo filtros de consulta conocidos. Nunca trasladar acciones, tokens o destinos.
  if (ROUTES[path] && !["/admin", "/admin/login", "/admin/productos/nuevo"].includes(path)) {
    const params = new URLSearchParams(query);
    for (const key of ["q", "query", "search", "page", "p", "tab", "status", "from", "to", "desde", "hasta", "mes", "year", "month", "branch", "vendor", "category", "brand", "sort", "order", "limit", "origin", "state", "on_sale", "stock", "out", "visibility", "user", "user_id", "vendor_id", "branch_id", "sucursal", "days", "period", "ref"]) {
      const value = params.get(key);
      if (value && value.length <= 200) destination.searchParams.set(key, value);
    }
  }
  return destination.toString();
}

