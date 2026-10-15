import { getCpiSalesStatus } from "@/lib/cpi-sales-status";

function dateLabel(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "No disponible";
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Costa_Rica" }).format(new Date(value));
}

export async function CpiSalesStatusNotice() {
  const status = await getCpiSalesStatus();
  if (status.state === "fresh") return <p className="mb-4 text-xs text-ink-500">Ventas CPI · Última actualización registrada: {dateLabel(status.syncedAt)}.</p>;
  return <aside role="status" aria-label="Estado de la sincronización de ventas CPI" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    <p className="font-bold">{status.state === "unavailable" ? "No se pudo comprobar la actualización de ventas" : status.state === "empty" ? "Todavía no hay ventas sincronizadas de CPI" : "Datos de ventas desactualizados"}</p>
    {status.syncedAt && <p className="mt-1">Última actualización registrada: {dateLabel(status.syncedAt)}. Última factura disponible: {dateLabel(status.latestSaleAt)}.</p>}
    <p className="mt-1">Las ventas recientes pueden faltar. Un cero o una lista vacía no confirma que el vendedor no haya vendido. Los totales y rankings corresponden únicamente a la copia disponible; revisá CPI antes de tomar decisiones.</p>
    <p className="mt-1 text-xs">Administración debe revisar la conexión con CPI y completar la sincronización. Cambiar de periodo o recargar la página no recupera las facturas faltantes.</p>
  </aside>;
}
