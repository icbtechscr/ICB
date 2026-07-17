// Conocimiento del negocio que alimenta al chatbot IA.
// El bot SOLO sabe lo que esté aquí (más lo que consulte en vivo del catálogo).
// Mantener esta información actualizada para que las respuestas sean correctas.
import { BRANCHES } from "./branches";

// Texto con las sucursales, generado a partir de la fuente de verdad (branches.ts)
// para no duplicar direcciones ni teléfonos.
function buildBranchesText(): string {
  return BRANCHES.filter((b) => !b.cedi && !b.remote)
    .map(
      (b) =>
        `- ${b.city}: ${b.name}. Dirección: ${b.address} Teléfono: ${b.phone}.`
    )
    .join("\n");
}

export const ICB_KNOWLEDGE = `
## Sobre ICB Technologies Costa Rica
ICB Technologies Costa Rica es una organización 100% costarricense con más de 20 años de
experiencia en el comercio de tecnología. Vendemos computadoras, cámaras de
seguridad (CCTV), equipos de redes, periféricos y sistemas POS (punto de venta).
Somos distribuidor oficial de las marcas Dahua, Hikvision y Uniview en Costa Rica.
Sitio web: https://icbtechscr.com

## Sucursales
Tenemos varias sucursales en Costa Rica:
${buildBranchesText()}
Para llegar a cualquier sucursal, la persona puede pedir el enlace de Google Maps
o Waze en la página /sucursales del sitio.

## Horario de atención
Lunes a viernes de 8:00 a.m. a 5:00 p.m. y sábados de 8:00 a.m. a 1:00 p.m.
(Si no estás seguro del horario exacto de una sede en particular, sugiere
contactar a esa sucursal por teléfono.)

## Métodos de pago
Aceptamos tarjeta (crédito/débito) mediante pago en línea seguro, transferencia
bancaria, SINPE Móvil, links de pago y efectivo en sucursal. En la zona de
cobertura también se puede pagar contra entrega.

## Envíos
- Existe un monto mínimo de compra para aplicar envío.
- Hacemos envíos dentro de la Gran Área Metropolitana y, por encomienda o
  servicios de transporte, a todo el país.
- Las tarifas se calculan por kilómetro recorrido / por zona.
- Para envíos fuera de la zona de cobertura se solicita pago previo.
- Dentro de la zona de cobertura se acepta pago contra entrega.
- Algunos productos son por encargo o contra pedido (sujetos a disponibilidad).
Para los detalles completos, indica que pueden consultar la página /envios.

## Garantía, cambios y devoluciones
- Los productos tienen garantía del fabricante y la garantía legal aplicable.
- Hay un plazo definido para solicitar cambios o devoluciones comerciales; el
  producto debe estar en condiciones de venta (empaque y accesorios completos).
- Para los detalles completos, indica que pueden consultar la página /devoluciones.

## Contacto
La persona puede escribir o llamar y un asesor la atenderá. Los teléfonos por
sucursal están arriba. También está la página /contacto del sitio.

## Catálogo de productos
Puedes consultar el catálogo real (precios, disponibilidad y nombres exactos)
usando la herramienta de búsqueda de productos. Úsala siempre que la persona
pregunte por un producto, precio, marca o disponibilidad concreta, en lugar de
inventar datos. Los precios están en colones costarricenses (CRC, ₡).
`.trim();
