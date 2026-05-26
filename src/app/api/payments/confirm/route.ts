import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyMountResult } from "@/lib/cybersource";

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
      .select("id, order_number, payment_status")
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

    // El JWT trae el resultado del pago ya procesado por UC (autoProcessing).
    const result = verifyMountResult(resultJwt);
    console.log("[PAY] verifyMountResult:", JSON.stringify(result, null, 2));

    const newPaymentStatus = result.ok ? "pagado" : "rechazado";
    const newOrderStatus = result.ok ? "pagado" : "pendiente";

    await sb
      .from("orders")
      .update({
        payment_status: newPaymentStatus,
        status: newOrderStatus,
        payment_reference: result.id ?? null,
        payment_response: result.payload as object | null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: result.status,
          reasonCode: result.reasonCode,
          message: result.message ?? "Pago rechazado",
          payload: result.payload,
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
