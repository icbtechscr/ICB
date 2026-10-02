import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserRole, isAdminLike } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase";
import { lookupTransactionByOrderNumber } from "@/lib/cybersource";
import { sendCustomerReceipt } from "@/lib/email";

export const dynamic = "force-dynamic";

// Le pregunta a Cybersource que paso de verdad con los pedidos de tarjeta que
// quedaron en "pendiente". Pasa cuando el cliente cierra la pestana o se le cae
// la conexion justo despues de pagar: la tarjeta se cobro, pero el navegador
// nunca alcanzo a avisarle al sitio.
//
//   POST { orderId }  -> revisa solo ese pedido
//   POST {}           -> revisa todos los pendientes de los ultimos 45 dias

type OrderRow = {
  id: string;
  order_number: string;
  payment_status: string | null;
  status: string | null;
  payment_method: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_crc: number | null;
  shipping_method: string | null;
};

const DAYS_BACK = 45;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdminLike(getUserRole(user))) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  let orderId: string | null = null;
  try {
    const body = (await req.json()) as { orderId?: unknown };
    if (typeof body.orderId === "string") orderId = body.orderId;
  } catch {
    /* sin cuerpo: se revisan todos */
  }

  const sb = createAdminClient();
  const cols =
    "id, order_number, payment_status, status, payment_method, customer_name, customer_email, customer_phone, total_crc, shipping_method";

  let orders: OrderRow[] = [];
  if (orderId) {
    const { data } = await sb.from("orders").select(cols).eq("id", orderId).limit(1);
    orders = (data ?? []) as OrderRow[];
  } else {
    const since = new Date(Date.now() - DAYS_BACK * 86400_000).toISOString();
    const { data } = await sb
      .from("orders")
      .select(cols)
      .eq("payment_method", "tarjeta")
      .neq("payment_status", "pagado")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    orders = (data ?? []) as OrderRow[];
  }

  if (orders.length === 0) {
    return NextResponse.json({ ok: true, revisados: 0, cobrados: 0, detalle: [] });
  }

  const detalle: {
    pedido: string;
    resultado: "cobrado" | "no cobrado" | "sin registro" | "error";
    estado?: string;
    monto?: string;
    error?: string;
  }[] = [];
  let cobrados = 0;

  for (const o of orders) {
    try {
      if (o.payment_method !== "tarjeta" || o.payment_status === "pagado") continue;
      const tx = await lookupTransactionByOrderNumber(o.order_number, true);

      if (!tx.found) {
        // OJO: "sin registro" significa que Cybersource no tiene ninguna
        // transaccion con ese numero de orden en los ultimos 90 dias. Lo mas
        // probable es que el cliente nunca completo el formulario, pero no es
        // una prueba de que no se le cobro por otra via.
        detalle.push({ pedido: o.order_number, resultado: "sin registro" });
        continue;
      }
      if (!tx.ok && (tx.reasonCode === "100" || ["PENDING", "AUTHORIZED", "PARTIAL_AUTHORIZED"].includes(tx.status))) {
        detalle.push({ pedido: o.order_number, resultado: "error", estado: tx.status,
          error: "Captura pendiente de confirmación; no se modificó el pedido." });
        continue;
      }
      if (!tx.id || tx.currency !== "CRC" || !Number.isFinite(Number(tx.amount)) ||
          Math.round(Number(tx.amount) * 100) !== Math.round(Number(o.total_crc) * 100)) {
        detalle.push({ pedido: o.order_number, resultado: "error", error: "Monto o moneda no coinciden; no se modificó el pedido." });
        continue;
      }

      const nuevoPago = tx.ok ? "pagado" : "rechazado";
      const yaEstaba = o.payment_status === nuevoPago;

      if (!yaEstaba) {
        const { data: saved, error: saveError } = await sb
          .from("orders")
          .update({
            payment_status: nuevoPago,
            // El estado del pedido no se toca si ya lo movio una persona.
            ...(o.status === "pendiente" && tx.ok ? { status: "pagado" } : {}),
            payment_reference: tx.id ?? null,
            payment_response: { verified_by: "cybersource_server_search", status: tx.status, reasonCode: tx.reasonCode,
              amount: tx.amount, currency: tx.currency, submittedAt: tx.submittedAt },
            updated_at: new Date().toISOString(),
          })
          .eq("id", o.id)
          .neq("payment_status", "pagado")
          .select("id")
          .maybeSingle();
        if (saveError) throw new Error("No se pudo guardar la verificación del pago.");
        if (!saved) continue;
      }

      // Si descubrimos ahora que si se cobro, el cliente nunca recibio su
      // comprobante: se le manda.
      if (tx.ok && !yaEstaba) {
        cobrados++;
        try {
          const { data: items } = await sb
            .from("order_items")
            .select("product_name, qty, line_total_crc")
            .eq("order_id", o.id);
          await sendCustomerReceipt({
            orderNumber: o.order_number,
            customerName: o.customer_name ?? "",
            customerEmail: o.customer_email ?? "",
            customerPhone: o.customer_phone ?? "",
            total: Number(o.total_crc) || 0,
            paymentMethod: o.payment_method ?? "tarjeta",
            shippingMethod: o.shipping_method ?? "",
            items: (items ?? []).map(
              (i: { product_name: string; qty: number; line_total_crc: number }) => ({
                name: i.product_name,
                qty: i.qty,
                lineTotal: Number(i.line_total_crc) || 0,
              })
            ),
            authCode: tx.id,
          });
        } catch {
          /* el correo nunca debe tumbar la verificacion */
        }
      }

      detalle.push({
        pedido: o.order_number,
        resultado: tx.ok ? "cobrado" : "no cobrado",
        estado: tx.status,
        monto: tx.amount ? `${tx.amount} ${tx.currency ?? ""}`.trim() : undefined,
      });
    } catch (e) {
      detalle.push({
        pedido: o.order_number,
        resultado: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    revisados: orders.length,
    cobrados,
    detalle,
  });
}
