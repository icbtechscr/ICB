import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createSession, getSdkAssets, paymentErrorDetails } from "@/lib/cybersource";
import { writeAuditEvent } from "@/lib/audit";

type Body = {
  orderId?: string;
};

export async function POST(req: Request) {
  try {
    const { orderId } = (await req.json()) as Body;
    if (!orderId) {
      return new NextResponse("orderId requerido", { status: 400 });
    }

    const sb = createAdminClient();
    const { data: order, error } = await sb
      .from("orders")
      .select(
        "id, order_number, total_crc, payment_method, payment_status, customer_name, customer_email, customer_phone, shipping_address, shipping_canton, shipping_province"
      )
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return new NextResponse("Orden no encontrada", { status: 404 });
    }
    if (order.payment_method !== "tarjeta" || order.payment_status === "pagado") {
      return new NextResponse("Este pedido no admite un nuevo pago con tarjeta.", { status: 409 });
    }

    // Origen real desde donde se abrió el checkout (www o apex). Lo usamos como
    // targetOrigin para que coincida exacto y Cybersource no devuelva
    // "target origins are unused".
    const requestOrigin =
      req.headers.get("origin") ??
      (req.headers.get("host") ? `https://${req.headers.get("host")}` : undefined);

    const sessionJwt = await createSession({
      amountCRC: Number(order.total_crc),
      orderNumber: order.order_number,
      targetOrigin: requestOrigin ?? undefined,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        address: order.shipping_address ?? undefined,
        locality: order.shipping_canton ?? undefined,
        administrativeArea: order.shipping_province ?? undefined,
      },
    });

    const { clientLibrary, clientLibraryIntegrity } = getSdkAssets(sessionJwt);
    await writeAuditEvent({ action: "PAYMENT_SESSION_CREATED", table_name: "orders", source: "/api/payments/capture-context",
      details: { order_number: order.order_number, sdk_available: Boolean(clientLibrary) } });

    return NextResponse.json({
      sessionJwt,
      clientLibrary,
      clientLibraryIntegrity,
    });
  } catch (e) {
    console.error("[PAY] session creation failed", paymentErrorDetails(e));
    await writeAuditEvent({ action: "PAYMENT_SESSION_ERROR", table_name: "orders", source: "/api/payments/capture-context",
      details: paymentErrorDetails(e) });
    return new NextResponse("No pudimos abrir la pasarela de tarjeta. No se realizó ningún cobro; intentá nuevamente o contactá a la tienda.", { status: 503 });
  }
}
