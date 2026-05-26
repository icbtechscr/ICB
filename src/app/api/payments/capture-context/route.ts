import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createCaptureContext, decodeCaptureContext } from "@/lib/cybersource";

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
        "id, order_number, total_crc, customer_name, customer_email, customer_phone, shipping_address, shipping_canton, shipping_province"
      )
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return new NextResponse("Orden no encontrada", { status: 404 });
    }

    const jwt = await createCaptureContext({
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

    const { clientLibrary, clientLibraryIntegrity } = decodeCaptureContext(jwt);

    // Decodificar payload completo para debug (NO incluye secretos, solo config pública del JWT).
    let debugPayload: unknown = null;
    try {
      const parts = jwt.split(".");
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      debugPayload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch {}

    return NextResponse.json({
      captureContext: jwt,
      clientLibrary,
      clientLibraryIntegrity,
      debugPayload,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(msg, { status: 500 });
  }
}
