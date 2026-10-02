import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { lookupTransactionByOrderNumber, paymentErrorDetails } from "@/lib/cybersource";
import { writeAuditEvent } from "@/lib/audit";
import { notifyPaymentResult, sendCustomerReceipt } from "@/lib/email";

type Body = {
  orderId?: string;
  // El JWT que devuelve checkout.mount() cuando autoProcessing=true.
  // Contiene el resultado del pago ya procesado por UC.
  resultJwt?: string;
};

export async function POST(req: Request) {
  try {
    const { orderId, resultJwt } = (await req.json()) as Body;
    if (!orderId || !resultJwt) {
      return new NextResponse("Faltan orderId o resultJwt", { status: 400 });
    }

    const sb = createAdminClient();
    const { data: order, error } = await sb
      .from("orders")
      .select("id, order_number, status, payment_status, customer_name, customer_email, customer_phone, total_crc, payment_method, shipping_method")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return new NextResponse("Orden no encontrada", { status: 404 });
    }

    if (order.payment_status === "pagado") {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        orderNumber: order.order_number,
      });
    }

    if (order.payment_method !== "tarjeta") {
      return NextResponse.json({ ok: false, message: "Este pedido no corresponde a un pago con tarjeta." }, { status: 409 });
    }

    // El navegador no es autoridad de pago. Consultar nuestra cuenta del proveedor;
    // no confiar en el JWT, sus estados, IDs ni montos enviados por el cliente.
    const result = await lookupTransactionByOrderNumber(order.order_number, true);
    const pending = !result.found || (!result.ok &&
      (result.reasonCode === "100" || ["PENDING", "AUTHORIZED", "PARTIAL_AUTHORIZED"].includes(result.status)));
    if (pending) {
      await writeAuditEvent({ action: "PAYMENT_VERIFICATION_PENDING", table_name: "orders", source: "/api/payments/confirm",
        details: { order_number: order.order_number, provider_status: result.status } });
      return NextResponse.json({ ok: false, pending: true, message: "Cybersource todavía no confirma la captura. No vuelvas a pagar; verificá el resultado nuevamente." }, { status: 202 });
    }
    if (!result.id || result.currency !== "CRC" || !Number.isFinite(Number(result.amount)) ||
        Math.round(Number(result.amount) * 100) !== Math.round(Number(order.total_crc) * 100)) {
      await writeAuditEvent({ action: "PAYMENT_VERIFICATION_MISMATCH", table_name: "orders", source: "/api/payments/confirm",
        details: { order_number: order.order_number, provider_status: result.status } });
      return NextResponse.json({ ok: false, message: "No se pudo validar el monto y la moneda del pago. Contactá a la tienda antes de volver a pagar." }, { status: 409 });
    }

    const newPaymentStatus = result.ok ? "pagado" : "rechazado";
    const newOrderStatus = !order.status || ["pendiente", "pagado"].includes(order.status)
      ? (result.ok ? "pagado" : "pendiente") : order.status;

    const { data: saved, error: saveError } = await sb
      .from("orders")
      .update({
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        payment_reference: result.id ?? null,
        payment_response: { verified_by: "cybersource_server_search", status: result.status, reasonCode: result.reasonCode,
          amount: result.amount, currency: result.currency, submittedAt: result.submittedAt },
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .neq("payment_status", "pagado")
      .select("id")
      .maybeSingle();
    if (saveError) {
      console.error("[PAY] persistence failed", saveError.code);
      return NextResponse.json({ ok: false, message: "No pudimos guardar la confirmación. No vuelvas a pagar; contactá a la tienda para verificar tu pedido." }, { status: 503 });
    }
    if (!saved) {
      const { data: current } = await sb.from("orders").select("payment_status").eq("id", orderId).single();
      if (current?.payment_status === "pagado") {
        return NextResponse.json({ ok: true, alreadyPaid: true, orderNumber: order.order_number });
      }
      return NextResponse.json({ ok: false, message: "No pudimos guardar la confirmación. No vuelvas a pagar; contactá a la tienda." }, { status: 503 });
    }
    await writeAuditEvent({ action: result.ok ? "PAYMENT_CAPTURE_VERIFIED" : "PAYMENT_DECLINED_VERIFIED", table_name: "orders",
      source: "/api/payments/confirm", details: { order_number: order.order_number, provider_status: result.status, reason_code: result.reasonCode } });

    // Comprobante al CLIENTE: solo si el pago fue aprobado (ya se rebajo).
    if (result.ok) {
      try {
        const { data: items } = await sb
          .from("order_items")
          .select("product_name, qty, line_total_crc")
          .eq("order_id", orderId);
        const pi = ((result.payload as Record<string, unknown> | null)
          ?.paymentInformation ?? {}) as Record<string, unknown>;
        const card = (pi.card ?? pi.tokenizedCard ?? {}) as Record<string, unknown>;
        const proc = ((result.payload as Record<string, unknown> | null)
          ?.processorInformation ?? {}) as Record<string, unknown>;
        const CARD_BRAND: Record<string, string> = {
          "001": "Visa",
          "002": "Mastercard",
          "003": "Amex",
          "004": "Discover",
        };
        const brandCode = card.type as string | undefined;
        await sendCustomerReceipt({
          orderNumber: order.order_number,
          customerName: order.customer_name ?? "",
          customerEmail: order.customer_email ?? "",
          customerPhone: order.customer_phone ?? "",
          total: Number(order.total_crc) || 0,
          paymentMethod: order.payment_method ?? "tarjeta",
          shippingMethod: order.shipping_method ?? "",
          items: (items ?? []).map(
            (i: { product_name: string; qty: number; line_total_crc: number }) => ({
              name: i.product_name,
              qty: i.qty,
              lineTotal: Number(i.line_total_crc) || 0,
            })
          ),
          authCode:
            (proc.approvalCode as string | undefined) ??
            (proc.transactionId as string | undefined),
          cardBrand: brandCode ? CARD_BRAND[brandCode] ?? brandCode : undefined,
          cardLast4: card.suffix as string | undefined,
        });
      } catch {
        /* ignorar errores de correo */
      }
    }

    // Aviso al admin del resultado del pago (nunca rompe la respuesta).
    try {
      await notifyPaymentResult(
        {
          orderNumber: order.order_number,
          customerName: order.customer_name ?? "",
          customerEmail: order.customer_email ?? "",
          customerPhone: order.customer_phone ?? "",
          total: Number(order.total_crc) || 0,
          paymentMethod: order.payment_method ?? "tarjeta",
          shippingMethod: order.shipping_method ?? "",
        },
        result.ok,
        result.ok ? undefined : "Pago no aprobado por Cybersource"
      );
    } catch {
      /* ignorar errores de correo */
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: result.status,
          reasonCode: result.reasonCode,
          message: "Pago no aprobado por Cybersource",
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.order_number,
      paymentId: result.id,
      status: result.status,
    });
  } catch (e) {
    console.error("[PAY] verification unavailable", paymentErrorDetails(e));
    await writeAuditEvent({ action: "PAYMENT_VERIFICATION_ERROR", table_name: "orders", source: "/api/payments/confirm",
      details: paymentErrorDetails(e) });
    return NextResponse.json({ ok: false, message: "No pudimos verificar el pago con el proveedor. No vuelvas a pagar; intentá verificarlo nuevamente o contactá a la tienda." }, { status: 503 });
  }
}
