import {stockSaleModes} from '@/lib/stock-sale-server';
import {webPurchaseStock,MAX_WEB_ORDER_QUANTITY} from '@/lib/web-purchase-stock';
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getProductsByIds } from "@/lib/products";
import {
  computeShippingCost,
  generateOrderNumber,
  MINIMUM_SUBTOTAL_FOR_SHIPPING,
  requiresShippingMinimum,
} from "@/lib/orders";
import { distanceKm, ORIGIN, getZone } from "@/lib/shipping";
import { stockOrderLimit } from "@/lib/stock";
import { notifyNewOrder } from "@/lib/email";

type Body = {
  requestId?: string;
  items?: { id: string; qty: number }[];
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    idNumber?: string;
  };
  shipping?: {
    province?: string;
    canton?: string;
    address?: string;
    method?: string;
    notes?: string;
    zoneId?: string | null;
    size?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  paymentMethod?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if(!Array.isArray(body.items)||body.items.length>100||body.items.some(i=>!i||typeof i.id!=='string'||!Number.isSafeInteger(i.qty)||i.qty<1||i.qty>MAX_WEB_ORDER_QUANTITY))return new NextResponse('Revisá los productos y cantidades.',{status:400});
    const grouped=new Map<string,number>();for(const i of body.items)grouped.set(i.id,(grouped.get(i.id)||0)+i.qty);
    const items=[...grouped].map(([id,qty])=>({id,qty}));if(items.some(i=>i.qty>MAX_WEB_ORDER_QUANTITY))return new NextResponse('La cantidad solicitada supera el máximo por pedido.',{status:400});
    if(body.requestId!==undefined&&!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.requestId))return new NextResponse('Revisá el número de operación.',{status:400});
    const requestId=body.requestId||crypto.randomUUID();
    if (items.length === 0) {
      return new NextResponse("El carrito está vacío", { status: 400 });
    }
    const customer = body.customer ?? {};
    if (!customer.name || !customer.email || !customer.phone) {
      return new NextResponse("Faltan datos del cliente", { status: 400 });
    }
    const shipping = body.shipping ?? {};
    const shippingMethod = shipping.method ?? "encomienda";
    const paymentMethod = body.paymentMethod ?? "tarjeta";

    // Detalle del envío para el equipo de despacho.
    const shippingDetailParts = [shipping.notes ?? ""];
    if (shippingMethod === "encomienda") {
      const zone = getZone(shipping.zoneId);
      const size = shipping.size === "carro" ? "carro" : "moto";
      if (zone)
        shippingDetailParts.push(
          `Encomienda: ${zone.label} · ${zone.zone} (${size})`
        );
    }
    if (
      shippingMethod !== "recogida" &&
      typeof shipping.lat === "number" &&
      typeof shipping.lng === "number"
    ) {
      if (shippingMethod === "envio") {
        const km = Math.max(
          1,
          distanceKm(ORIGIN.lat, ORIGIN.lng, shipping.lat, shipping.lng)
        );
        shippingDetailParts.push(`Distancia: ~${km} km desde ICB San José`);
      }
      shippingDetailParts.push(
        `Ubicación: https://maps.google.com/?q=${shipping.lat},${shipping.lng}`
      );
    }
    const shippingNotes = shippingDetailParts.filter(Boolean).join(" · ") || null;

    // Recalcular precios desde la base de datos (no confiar en el cliente)
    const products = await getProductsByIds(items.map((i) => i.id));
    const priceMap = new Map(products.map((p) => [p.id, p]));

    const modes=await stockSaleModes(products.map(p=>p.id));
    for (const item of items) {
      const p = priceMap.get(item.id);
      if (!p) {
        return new NextResponse("Uno de los productos ya no está disponible.", {
          status: 409,
        });
      }
      const qty = item.qty;
      const sale=webPurchaseStock(p.stockStatus,p.stockQty,modes[p.id]);
      const stockLimit = stockOrderLimit(sale.stockStatus,sale.stockQty);
      if (stockLimit === 0) {
        return new NextResponse(
          `No hay unidades disponibles de ${p.name}.`,
          { status: 409 }
        );
      }
      if (stockLimit !== null && qty > stockLimit) {
        return new NextResponse(
          `Solo hay ${stockLimit} unidad${stockLimit === 1 ? "" : "es"} disponible${stockLimit === 1 ? "" : "s"} de ${p.name}.`,
          { status: 409 }
        );
      }
    }

    const lineItems = items
      .map((i) => {
        const p = priceMap.get(i.id);
        if (!p) return null;
        const unit = p.salePriceCRC ?? p.priceCRC;
        const qty = i.qty;
        return {
          product_id: p.id,
          product_name: p.name,
          product_slug: p.slug,
          unit_price_crc: unit,
          qty,
          line_total_crc: unit * qty,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (lineItems.length === 0) {
      return new NextResponse("Ningún producto válido en el pedido", {
        status: 400,
      });
    }

    const subtotal = lineItems.reduce((a, i) => a + i.line_total_crc, 0);
    if (requiresShippingMinimum(shippingMethod) && subtotal < MINIMUM_SUBTOTAL_FOR_SHIPPING) {
      return new NextResponse("Para solicitar envío, el subtotal mínimo es de ₡10.000. También podés elegir recoger en sucursal para comprar cualquier monto.", {
        status: 400,
      });
    }
    const shippingCost = computeShippingCost({
      method: shippingMethod,
      lat: shipping.lat,
      lng: shipping.lng,
      zoneId: shipping.zoneId,
      size: shipping.size,
    });
    const total = subtotal + shippingCost;

    const sb=createAdminClient(),proposedNumber=generateOrderNumber();
    const {data:created,error:createError}=await sb.rpc('sgi_web_order_create',{p_request:requestId,p_input:{
      order_number:proposedNumber,customer_name:customer.name,customer_email:customer.email,customer_phone:customer.phone,customer_id_number:customer.idNumber??null,
      shipping_province:shipping.province??null,shipping_canton:shipping.canton??null,shipping_address:shipping.address??null,shipping_method:shippingMethod,shipping_notes:shippingNotes,payment_method:paymentMethod,
      subtotal_crc:subtotal,shipping_crc:shippingCost,total_crc:total,lines:lineItems
    }}).abortSignal(AbortSignal.timeout(20000));
    if(createError||!created?.orderId){const message=createError?.message==='stock_insufficient'?'Cambió la disponibilidad de un producto. Revisá el carrito.':createError?.message==='stock_request_conflict'?'Este intento corresponde a otros datos. Revisá el pedido antes de repetir.':'No se pudo confirmar el pedido. Conservá los datos e intentá nuevamente.';return new NextResponse(message,{status:createError?.message?.startsWith('stock_')?409:503});}
    const order={id:created.orderId},orderNumber=created.orderNumber;

    // Avisar al registrarse cualquier pedido, incluida tarjeta: todavía SIN pago.
    // La confirmación del proveedor enviará otro aviso solo con el resultado real.
    if(!created.repeated){
      try {
        await notifyNewOrder({
          orderNumber,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          total,
          paymentMethod,
          shippingMethod,
          items: lineItems.map((li) => ({
            name: li.product_name,
            qty: li.qty,
            lineTotal: li.line_total_crc,
          })),
        });
      } catch {
        /* ignorar errores de correo */
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber,
      subtotal,
      shippingCost,
      total,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(msg, { status: 500 });
  }
}
