// Envio de correos con Resend usando su API HTTP (sin dependencias npm).
// Si falta configuracion, las funciones no hacen nada y NUNCA rompen el pedido.
const RESEND_URL = "https://api.resend.com/emails";

function cfg() {
  return {
    key: process.env.RESEND_API_KEY ?? "",
    from: process.env.ORDER_MAIL_FROM ?? "ICB Tienda <pedidos@icbtechscr.com>",
    to: process.env.ORDER_NOTIFY_EMAIL ?? "",
  };
}

export function emailConfigured(): boolean {
  const c = cfg();
  return Boolean(c.key && c.to);
}

async function send(subject: string, html: string): Promise<void> {
  const c = cfg();
  if (!c.key || !c.to) return;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${c.key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: c.from,
        to: c.to
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[MAIL] Resend fallo:", res.status, await res.text());
    }
  } catch (e) {
    console.error("[MAIL] Error enviando correo:", e);
  }
}

export type OrderMailInfo = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  paymentMethod: string;
  shippingMethod: string;
  items?: { name: string; qty: number; lineTotal: number }[];
};

function money(n: number): string {
  return `₡${Math.round(n).toLocaleString("es-CR")}`;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function orderHtml(o: OrderMailInfo, headline: string, color: string): string {
  const rows = (o.items ?? [])
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#334">${i.qty}× ${esc(i.name)}</td>` +
        `<td style="padding:6px 0;text-align:right;color:#111;font-weight:600">${money(i.lineTotal)}</td></tr>`
    )
    .join("");
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto">
    <div style="background:${color};color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">
      <h2 style="margin:0;font-size:18px">${esc(headline)}</h2>
      <p style="margin:4px 0 0;opacity:.85;font-size:13px">Pedido ${esc(o.orderNumber)}</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:20px">
      <p style="margin:0 0 12px;font-size:22px;font-weight:800;color:#111">${money(o.total)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      <hr style="border:0;border-top:1px solid #eee;margin:16px 0" />
      <p style="margin:0;font-size:14px;color:#334">
        <strong>${esc(o.customerName)}</strong><br/>
        ${esc(o.customerEmail)}<br/>
        ${esc(o.customerPhone)}
      </p>
      <p style="margin:12px 0 0;font-size:13px;color:#667">
        Pago: <strong>${esc(o.paymentMethod)}</strong> · Entrega: <strong>${esc(o.shippingMethod)}</strong>
      </p>
    </div>
  </div>`;
}

/** Aviso al admin: entro un pedido nuevo desde la tienda. */
export async function notifyNewOrder(o: OrderMailInfo): Promise<void> {
  await send(
    `Nuevo pedido ${o.orderNumber} — ${money(o.total)} (${o.paymentMethod})`,
    orderHtml(o, "Nuevo pedido — pendiente de pago", "#b45309") +
      `<p style="max-width:560px;margin:12px auto 0;font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:13px;color:#667">` +
      `El cliente eligió <strong>${esc(o.paymentMethod)}</strong>. Verificá que el dinero haya entrado antes de despachar.</p>`
  );
}

/** Aviso al admin: resultado del pago con tarjeta. */
export async function notifyPaymentResult(
  o: OrderMailInfo,
  ok: boolean,
  message?: string
): Promise<void> {
  const headline = ok ? "Pago aprobado" : "Pago rechazado";
  const color = ok ? "#047857" : "#b91c1c";
  const extra = message
    ? `<p style="margin:12px 0 0;font-size:13px;color:#667">Detalle: ${esc(message)}</p>`
    : "";
  await send(
    `${headline} — pedido ${o.orderNumber}`,
    orderHtml(o, headline, color) + extra
  );
}
