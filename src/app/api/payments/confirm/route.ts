import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { processPayment } from "@/lib/cybersource";

function decodeJwtPayload(jwt: string): unknown {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

type Body = {
  orderId?: string;
  transientToken?: string;
};

export async function POST(req: Request) {
  try {
    const { orderId, transientToken } = (await req.json()) as Body;
    if (!orderId || !transientToken) {
      return new NextResponse("Faltan orderId o transientToken", { status: 400 });
    }

    const sb = createAdminClient();
    const { data: order, error } = await sb
      .from("orders")
      .select(
        "id, order_number, total_crc, payment_status, customer_name, customer_email, customer_phone, shipping_address, shipping_canton, shipping_province"
      )
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return new NextResponse("Orden no encontrada", { status: 404 });
    }

    if (order.payment_status === "pagado") {
      return NextResponse.json({ ok: true, alreadyPaid: true, orderNumber: order.order_number });
    }

    // Decodificar el TT para ver qué contiene (debug)
    const ttPayload = decodeJwtPayload(transientToken);
    console.log("[PAY] transient token payload:", JSON.stringify(ttPayload, null, 2));

    const result = await processPayment({
      transientTokenJwt: transientToken,
      amountCRC: Number(order.total_crc),
      orderNumber: order.order_number,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        address: order.shipping_address ?? undefined,
        locality: order.shipping_canton ?? undefined,
        administrativeArea: order.shipping_province ?? undefined,
      },
    });

    const newPaymentStatus = result.ok ? "pagado" : "rechazado";
    const newOrderStatus = result.ok ? "pagado" : "pendiente";

    await sb
      .from("orders")
      .update({
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        payment_reference: result.id ?? null,
        payment_response: result.raw as object | null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: result.status,
          reasonCode: result.reasonCode,
          message: result.message ?? "Pago rechazado por el banco",
          // Debug: respuesta cruda de Cybersource para entender el motivo
          rawDebug: result.raw,
          ttPayload,
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
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(msg, { status: 500 });
  }
}
