export const ORDER_STATUSES = [
  "pendiente",
  "pagado",
  "preparando",
  "enviado",
  "entregado",
  "cancelado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const SHIPPING_COST: Record<string, number> = {
  express: 4500,
  estandar: 2500,
  recogida: 0,
};

export const SHIPPING_LABEL: Record<string, string> = {
  express: "Express (24h)",
  estandar: "Estándar (2-4 días)",
  recogida: "Recogida en sucursal",
};

export const PAYMENT_LABEL: Record<string, string> = {
  tarjeta: "Tarjeta",
  sinpe: "SINPE Móvil",
  transferencia: "Transferencia bancaria",
};

export type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  productSlug: string | null;
  unitPrice: number;
  qty: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerIdNumber: string | null;
  shippingProvince: string | null;
  shippingCanton: string | null;
  shippingAddress: string | null;
  shippingMethod: string;
  shippingNotes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

// --- Mapeo de filas de Supabase ---
type ItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  unit_price_crc: number;
  qty: number;
  line_total_crc: number;
};

export type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_id_number: string | null;
  shipping_province: string | null;
  shipping_canton: string | null;
  shipping_address: string | null;
  shipping_method: string;
  shipping_notes: string | null;
  payment_method: string;
  payment_status: string;
  subtotal_crc: number;
  shipping_crc: number;
  total_crc: number;
  created_at: string;
  order_items: ItemRow[];
};

export function rowToOrder(r: OrderRow): Order {
  return {
    id: r.id,
    orderNumber: r.order_number,
    status: r.status as OrderStatus,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    customerPhone: r.customer_phone,
    customerIdNumber: r.customer_id_number,
    shippingProvince: r.shipping_province,
    shippingCanton: r.shipping_canton,
    shippingAddress: r.shipping_address,
    shippingMethod: r.shipping_method,
    shippingNotes: r.shipping_notes,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    subtotal: r.subtotal_crc,
    shippingCost: r.shipping_crc,
    total: r.total_crc,
    createdAt: r.created_at,
    items: (r.order_items ?? []).map((i) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.product_name,
      productSlug: i.product_slug,
      unitPrice: i.unit_price_crc,
      qty: i.qty,
      lineTotal: i.line_total_crc,
    })),
  };
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ICB-${ts}-${rand}`;
}
