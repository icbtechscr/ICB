// Ejecutar dentro del contenedor: crea un usuario temporal y lo elimina al finalizar.
// Sus eventos de auditoría se conservan deliberadamente.
import { randomBytes } from "node:crypto";

if (!process.argv.includes("--provision-test-user")) throw new Error("Requiere --provision-test-user");
const api = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!api || !key) throw new Error("Variables de Supabase faltantes");
const origin = "http://127.0.0.1:3000";
const email = `audit-verification-${Date.now()}@example.invalid`;
const password = randomBytes(32).toString("base64url");
const serviceHeaders = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
let userId;
async function service(path, init = {}) {
  const r = await fetch(`${api}${path}`, { ...init, headers: serviceHeaders, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`Servicio ${path.split("?")[0]}: HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}
try {
  const user = await service("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: "admin", full_name: "Prueba temporal de auditoría" } }) });
  userId = user.id;
  if (!userId) throw new Error("Usuario temporal no creado");
  const login = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), redirect: "manual" });
  if (login.status !== 200) throw new Error(`Login: HTTP ${login.status}`);
  const cookie = login.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("Login no devolvió cookies");
  for (const path of ["/admin/auditoria", "/admin/productos", "/admin/colaboradores/horario", "/admin/auditoria?table=public.orders&order=ICB-NOT-FOUND"]) {
    const r = await fetch(`${origin}${path}`, { headers: { cookie }, redirect: "manual" });
    const html = await r.text();
    if (r.status !== 200 || html.includes("No se pudo consultar la auditoría.")) throw new Error(`Panel ${path}: HTTP ${r.status} o error de consulta`);
    console.log(`PASS panel ${path.split("?")[0]}`);
  }
  // UUID deliberadamente inválido: PostgreSQL rechaza la operación sin tocar productos.
  const failed = await fetch(`${origin}/api/admin/products/audit-verification-invalid-uuid`, { method: "PATCH", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Prueba rechazada de auditoría" }), redirect: "manual" });
  if (failed.status !== 500) throw new Error(`Operación inválida: HTTP ${failed.status}`);
  const logout = await fetch(`${origin}/api/auth/logout`, { method: "POST", headers: { cookie }, redirect: "manual" });
  if (logout.status !== 200) throw new Error(`Logout: HTTP ${logout.status}`);
  const denied = await fetch(`${origin}/admin/auditoria`, { redirect: "manual" });
  if (denied.status !== 307 || !denied.headers.get("location")?.includes("/admin/login")) throw new Error("Auditoría pública accesible");
  const events = await service(`/rest/v1/audit_events?actor_id=eq.${userId}&select=action,source`);
  for (const action of ["LOGIN_OK", "LOGOUT_OK", "REQUEST_RECEIVED", "OPERATION_ERROR"]) if (!events.some(e => e.action === action)) throw new Error(`Falta evento ${action}`);
  console.log("PASS login, navegación, logout, acceso restringido y atribución del usuario");
} finally {
  if (userId) {
    await service(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
    console.log("Usuario temporal eliminado; historial conservado");
  }
}
