"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Download,
  Home,
  Package,
  Truck,
  Mail,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCRC } from "@/lib/utils";
import { BackgroundShader } from "@/components/ui/background-shader";
import { CheckoutStepper } from "@/components/CheckoutStepper";

type Order = {
  orderId: string;
  createdAt: string;
  items: {
    id: string;
    name: string;
    image: string | null;
    qty: number;
    unitPrice: number;
  }[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  shipping: {
    fullName: string;
    email: string;
    phone: string;
    province: string;
    canton: string;
    address: string;
    method: string;
  };
  paymentMethod: string;
};

const PAYMENT_LABEL: Record<string, string> = {
  tarjeta: "Tarjeta",
  sinpe: "SINPE Móvil",
  transferencia: "Transferencia bancaria",
};

const SHIPPING_LABEL: Record<string, string> = {
  express: "Express (24h)",
  estandar: "Estándar (2-4 días)",
  recogida: "Recogida en sucursal",
};

export default function ConfirmacionPage() {
  const { clear } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("icb-last-order");
      if (raw) setOrder(JSON.parse(raw));
    } catch {}
    clear();
  }, [clear]);

  if (!order) {
    return (
      <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
        <BackgroundShader palette="brand" speed={0.4} />
        <div className="relative mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-black">No encontramos tu pedido</h1>
          <p className="mt-2 text-white/70">
            Si acabás de pagar, recargá la página. De lo contrario, volvé al inicio.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900"
          >
            <Home className="size-4" />
            Inicio
          </Link>
        </div>
      </div>
    );
  }

  const eta = new Date(order.createdAt);
  if (order.shipping.method === "express") eta.setDate(eta.getDate() + 1);
  else if (order.shipping.method === "estandar") eta.setDate(eta.getDate() + 3);
  else eta.setDate(eta.getDate() + 1);

  function copyId() {
    if (!order) return;
    navigator.clipboard?.writeText(order.orderId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="brand" speed={0.4} />

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">Inicio</Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">Confirmación</span>
        </nav>

        <CheckoutStepper current={3} />

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="mt-10 flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 14 }}
            className="relative"
          >
            <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-emerald-400/30" />
            <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/40 ring-4 ring-white/20">
              <CheckCircle2 className="size-10 text-white" strokeWidth={2.5} />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-4xl font-black tracking-tight drop-shadow md:text-5xl"
          >
            ¡Gracias por tu compra!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-3 max-w-xl text-base text-white/80"
          >
            Recibimos tu pedido y te enviamos un correo de confirmación a{" "}
            <span className="font-semibold text-accent-300">
              {order.shipping.email}
            </span>
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={copyId}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/15"
          >
            <span className="text-white/60">Pedido:</span>
            <span className="font-mono text-accent-300">{order.orderId}</span>
            <span className="ml-1 inline-flex items-center gap-1 text-xs text-white/70">
              {copied ? "Copiado!" : <Copy className="size-3.5" />}
            </span>
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-10 grid gap-6 md:grid-cols-3"
        >
          <InfoCard Icon={Truck} title="Entrega estimada">
            <div className="text-lg font-black text-white">
              {eta.toLocaleDateString("es-CR", {
                weekday: "short",
                day: "numeric",
                month: "long",
              })}
            </div>
            <div className="mt-1 text-xs text-white/70">
              {SHIPPING_LABEL[order.shipping.method]}
            </div>
          </InfoCard>
          <InfoCard Icon={Package} title="Estado">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-400/30">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-300" />
              En preparación
            </div>
            <div className="mt-2 text-xs text-white/70">
              Te avisamos al despachar.
            </div>
          </InfoCard>
          <InfoCard Icon={Mail} title="Método de pago">
            <div className="text-lg font-black text-white">
              {PAYMENT_LABEL[order.paymentMethod]}
            </div>
            <div className="mt-1 text-xs text-white/70">
              {order.paymentMethod === "tarjeta"
                ? "Cobro aprobado"
                : "Pendiente de verificación"}
            </div>
          </InfoCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]"
        >
          <section className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
              <Package className="size-4 text-accent-300" />
              Productos ({order.items.reduce((a, i) => a + i.qty, 0)})
            </h2>
            <ul className="space-y-3">
              {order.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-4 border-b border-white/10 pb-3 last:border-0"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white">
                    {it.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image}
                        alt={it.name}
                        className="size-full object-contain p-1"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold text-white">
                      {it.name}
                    </div>
                    <div className="mt-0.5 text-xs text-white/60">
                      x{it.qty} · {formatCRC(it.unitPrice)}
                    </div>
                  </div>
                  <div className="text-sm font-black tabular-nums text-white">
                    {formatCRC(it.qty * it.unitPrice)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid gap-4 border-t border-white/15 pt-5 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Dirección de envío
                </h3>
                <div className="mt-2 text-sm">
                  <div className="font-bold text-white">
                    {order.shipping.fullName}
                  </div>
                  <div className="mt-0.5 text-white/75">
                    {order.shipping.address}
                  </div>
                  <div className="text-white/75">
                    {order.shipping.canton}, {order.shipping.province}
                  </div>
                  <div className="mt-1 text-white/60">
                    {order.shipping.phone}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Próximos pasos
                </h3>
                <ol className="mt-2 space-y-2 text-sm text-white/80">
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-300" />
                    Validamos el pago
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-300" />
                    Preparamos tu paquete
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-300" />
                    Te enviamos número de rastreo
                  </li>
                </ol>
              </div>
            </div>
          </section>

          <aside>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Total pagado
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Subtotal" value={formatCRC(order.subtotal)} />
                <Row label="IVA (13%)" value={formatCRC(order.tax)} />
                <Row
                  label="Envío"
                  value={
                    order.shippingCost === 0
                      ? "Gratis"
                      : formatCRC(order.shippingCost)
                  }
                  highlight={order.shippingCost === 0}
                />
                <div className="mt-2 flex items-end justify-between border-t border-white/15 pt-3">
                  <dt className="text-sm font-bold">Total</dt>
                  <dd className="text-3xl font-black tabular-nums text-accent-300">
                    {formatCRC(order.total)}
                  </dd>
                </div>
              </dl>

              <button
                onClick={() => window.print()}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/15"
              >
                <Download className="size-4" />
                Descargar comprobante
              </button>
              <Link
                href="/productos"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition hover:bg-accent-400"
              >
                Seguir comprando
              </Link>
              <Link
                href="/"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-white/70 hover:text-accent-300"
              >
                <Home className="size-3.5" />
                Volver al inicio
              </Link>
            </div>
          </aside>
        </motion.div>
      </div>
    </div>
  );
}

function InfoCard({
  Icon,
  title,
  children,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/70">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-accent-500/20 text-accent-300 ring-1 ring-accent-400/30">
          <Icon className="size-3.5" />
        </span>
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-white/70">{label}</dt>
      <dd
        className={`font-semibold tabular-nums ${
          highlight ? "text-accent-300" : "text-white"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
