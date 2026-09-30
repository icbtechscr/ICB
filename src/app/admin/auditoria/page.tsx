import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserRole, isAdminLike } from "@/lib/roles";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: number; created_at: string; action: string; table_name: string; record_id: string | null;
  actor_email: string | null; actor_id: string | null; source: string | null; request_id: string | null;
  before_data: unknown; after_data: unknown; details: unknown;
};

const labels: Record<string, string> = { INSERT: "Creado", UPDATE: "Modificado", DELETE: "Eliminado", BASELINE: "Estado inicial", REQUEST_RECEIVED: "Petición recibida", REQUEST_UNAUTHENTICATED: "Petición sin sesión", OPERATION_OK: "Operación completada", OPERATION_ERROR: "Operación fallida", LOGIN_OK: "Inicio de sesión", LOGIN_FAILED: "Inicio de sesión rechazado", APPLICATION_STARTED: "Inicio / despliegue de la aplicación" };
Object.assign(labels, { LOGOUT_OK: "Cierre de sesión", LOGOUT_FAILED: "Cierre de sesión fallido", SERVER_ERROR: "Error del servidor" });

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; table?: string; action?: string; record?: string; order?: string; email?: string; from?: string; to?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isAdminLike(getUserRole(user))) redirect("/portal");
  const p = await searchParams;
  const page = Math.max(1, Math.min(1000000, Number.parseInt(p.page || "1") || 1));
  let query = createAdminClient().from("audit_events").select("*", { count: "exact" }).order("id", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (p.table) query = query.eq("table_name", p.table);
  if (p.action) query = query.eq("action", p.action);
  if (p.record) query = query.eq("record_id", p.record);
  if (p.order && /^[a-z0-9-]+$/i.test(p.order.trim())) query = query.or(`before_data->>order_number.eq.${p.order.trim()},after_data->>order_number.eq.${p.order.trim()}`);
  if (p.email) query = query.eq("actor_email", p.email.trim());
  if (p.from && /^\d{4}-\d{2}-\d{2}$/.test(p.from)) query = query.gte("created_at", `${p.from}T00:00:00-06:00`);
  if (p.to && /^\d{4}-\d{2}-\d{2}$/.test(p.to)) query = query.lte("created_at", `${p.to}T23:59:59.999-06:00`);
  const { data, error, count } = await query;
  const rows = (data || []) as AuditRow[];
  function href(next: number) { const q = new URLSearchParams(); for (const [k,v] of Object.entries(p)) if (v && k !== "page") q.set(k,v); q.set("page",String(next)); return `/admin/auditoria?${q}`; }
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-black">Auditoría</h1><p className="text-sm text-ink-600">Historial permanente desde su activación. Cada cambio guarda el detalle anterior y posterior, incluso cuando se elimina el original.</p><p className="mt-2 text-xs text-ink-500">Solo lectura · sin borrado ni purga automática · las peticiones recibidas no prueban que una acción se haya completado. No se guardan contraseñas, tokens ni datos de tarjeta.</p></div>
    <form className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
      <input name="table" defaultValue={p.table} placeholder="Tabla: public.orders" className="rounded border px-3 py-2" />
      <input name="record" defaultValue={p.record} placeholder="ID del registro" className="rounded border px-3 py-2" />
      <input name="order" defaultValue={p.order} placeholder="Número de pedido: ICB-…" className="rounded border px-3 py-2" />
      <input name="email" defaultValue={p.email} placeholder="Correo del administrador" className="rounded border px-3 py-2" />
      <select name="action" defaultValue={p.action || ""} className="rounded border px-3 py-2"><option value="">Todas las acciones</option>{Object.entries(labels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
      <label className="text-xs">Desde<input type="date" name="from" defaultValue={p.from} className="block rounded border px-3 py-2" /></label>
      <label className="text-xs">Hasta<input type="date" name="to" defaultValue={p.to} className="block rounded border px-3 py-2" /></label>
      <button className="rounded bg-brand-600 px-4 py-2 text-white">Filtrar</button><Link href="/admin/auditoria" className="p-2">Limpiar filtros</Link>
    </form>
    {error ? <p role="alert" className="rounded border border-red-300 p-4 text-red-700">No se pudo consultar la auditoría. {error.message}</p> : <>
      <p className="text-sm">{count || 0} registros · página {page}</p>
      <div className="space-y-3">{rows.map(row => <details key={row.id} className="rounded-xl border bg-white p-4">
        <summary className="cursor-pointer text-sm"><span className="font-bold">#{row.id} · {labels[row.action] || row.action} · {row.table_name}</span><span className="ml-3">{new Date(row.created_at).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })}</span><span className="ml-3">{row.actor_email || row.actor_id || (row.source === "database" ? "Base de datos / sistema" : "Visitante / sistema")}</span><span className="ml-3 text-ink-500">{row.source} {row.record_id}</span></summary>
        <p className="mt-3 text-xs text-ink-500">Petición: {row.request_id || "—"} · Usuario: {row.actor_id || "—"}</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">{[["Antes",row.before_data],["Después",row.after_data],["Detalles",row.details]].map(([label,value]) => <div key={String(label)}><h2 className="font-bold">{String(label)}</h2><pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-ink-50 p-3 text-xs">{JSON.stringify(value,null,2)}</pre></div>)}</div>
      </details>)}{!rows.length && <p>No hay registros con estos filtros.</p>}</div>
      <div className="flex gap-5">{page > 1 && <Link href={href(page - 1)}>← Anterior</Link>}{(count || 0) > page * 50 && <Link href={href(page + 1)}>Siguiente →</Link>}</div>
    </>}
  </div>;
}
