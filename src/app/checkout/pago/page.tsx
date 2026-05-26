"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Smartphone,
  Building2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCRC } from "@/lib/utils";
import { BackgroundShader } from "@/components/ui/background-shader";
import { CheckoutStepper } from "@/components/CheckoutStepper";
import { UnifiedCheckout } from "@/components/UnifiedCheckout";

const SHIPPING_KEY = "icb-checkout-v1";
const PAYMENT_KEY = "icb-payment-v1";

type Method = "tarjeta" | "sinpe" | "transferencia";

type PaymentForm = {
  method: Method;
  sinpePhone: string;
  acceptTerms: boolean;
};

const SHIPPING_OPTIONS_PRICE: Record<string, number> = {
  express: 4500,
  estandar: 2500,
  recogida: 0,
};

const METHODS: { id: Method; label: string; desc: string; Icon: typeof CreditCard }[] = [
  {
    id: "tarjeta",
    label: "Tarjeta de crédito/débito",
    desc: "Visa, Mastercard, AmEx · Procesado por BAC con 3-D Secure",
    Icon: CreditCard,
  },
  {
    id: "sinpe",
    label: "SINPE Móvil",
    desc: "Transferencia inmediata desde tu banco",
    Icon: Smartphone,
  },
  {
    id: "transferencia",
    label: "Transferencia bancaria",
    desc: "BAC, BCR, BN · Confirmación en 1 día hábil",
    Icon: Building2,
  },
];

type Shipping = {
  method: string;
  fullName: string;
  email: string;
  phone: string;
  province: string;
  canton: string;
  address: string;
  notes: string;
};

export default function PagoPage() {
  const router = useRouter();
  const { items, subtotal, count } = useCart();
  const [shipping, setShipping] = useState<Shipping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>({
    method: "tarjeta",
    sinpePhone: "",
    acceptTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Estado específico de Unified Checkout (tarjeta).
  const [captureContext, setCaptureContext] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sdkUrl, setSdkUrl] = useState<string | null>(null);
  const [sdkIntegrity, setSdkIntegrity] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHIPPING_KEY);
      if (raw) setShipping(JSON.parse(raw));
      const pay = localStorage.getItem(PAYMENT_KEY);
      if (pay) setForm((p) => ({ ...p, ...JSON.parse(pay) }));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!shipping) router.replace("/checkout");
  }, [hydrated, shipping, router]);

  const shippingCost = shipping
    ? SHIPPING_OPTIONS_PRICE[shipping.method] ?? 0
    : 0;
  const total = subtotal + shippingCost;

  async function createOrder(): Promise<{ orderId: string; orderNumber: string } | null> {
    if (!shipping) return null;
    const cedula = (shipping.notes ?? "").split("||")[0] || "";
    const realNotes = (shipping.notes ?? "").split("||")[1] || "";
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((it) => ({ id: it.id, qty: it.qty })),
        customer: {
          name: shipping.fullName,
          email: shipping.email,
          phone: shipping.phone,
          idNumber: cedula,
        },
        shipping: {
          province: shipping.province,
          canton: shipping.canton,
          address: shipping.address,
          method: shipping.method,
          notes: realNotes,
        },
        paymentMethod: form.method,
      }),
    });
    if (!res.ok) {
      setError(await res.text());
      return null;
    }
    const data = (await res.json()) as {
      orderId: string;
      orderNumber: string;
      subtotal: number;
      shippingCost: number;
      total: number;
    };
    localStorage.setItem(
      "icb-last-order",
      JSON.stringify({
        orderId: data.orderNumber,
        createdAt: new Date().toISOString(),
        items,
        subtotal: data.subtotal,
        shippingCost: data.shippingCost,
        total: data.total,
        shipping,
        paymentMethod: form.method,
      })
    );
    return { orderId: data.orderId, orderNumber: data.orderNumber };
  }

  // Flujo tarjeta: crear orden -> obtener capture context -> montar iframe.
  async function startCardFlow() {
    if (!form.acceptTerms) return;
    setSubmitting(true);
    setError(null);
    try {
      localStorage.setItem(PAYMENT_KEY, JSON.stringify(form));
      const ord = await createOrder();
      if (!ord) {
        setSubmitting(false);
        return;
      }
      setOrderId(ord.orderId);

      const ccRes = await fetch("/api/payments/capture-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: ord.orderId }),
      });
      if (!ccRes.ok) {
        setError(await ccRes.text());
        setSubmitting(false);
        return;
      }
      const ccJson = (await ccRes.json()) as {
        captureContext: string;
        clientLibrary: string | null;
        clientLibraryIntegrity: string | null;
        debugPayload?: unknown;
      };
      console.log("[UC] capture-context JWT payload:", ccJson.debugPayload);
      if (!ccJson.clientLibrary) {
        setError("Cybersource no devolvió la URL del SDK en el capture-context.");
        setSubmitting(false);
        return;
      }
      setCaptureContext(ccJson.captureContext);
      setSdkUrl(ccJson.clientLibrary);
      setSdkIntegrity(ccJson.clientLibraryIntegrity);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  // Cuando UC devuelve el transient token, confirmamos el pago en el backend.
  async function onTransientToken(transientToken: string) {
    if (!orderId) return;
    setError(null);
    try {
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, transientToken }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        status?: string;
        reasonCode?: string;
        rawDebug?: unknown;
      };
      console.log("[PAY] /confirm response:", data);
      if (!res.ok || !data.ok) {
        setError(data.message ?? `Pago rechazado (${data.status ?? res.status})`);
        // Permitir reintentar: reseteamos el iframe.
        setCaptureContext(null);
        setSubmitting(false);
        return;
      }
      router.push("/checkout/confirmacion");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  // Flujo SINPE / transferencia: crear orden y mandar a confirmación.
  async function onSubmitOffline(e: React.FormEvent) {
    e.preventDefault();
    if (!form.acceptTerms || !shipping) return;
    setSubmitting(true);
    setError(null);
    try {
      localStorage.setItem(PAYMENT_KEY, JSON.stringify(form));
      const ord = await createOrder();
      if (!ord) {
        setSubmitting(false);
        return;
      }
      router.push("/checkout/confirmacion");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
        <BackgroundShader palette="brand" speed={0.4} />
        <div className="relative mx-auto flex max-w-2xl items-center justify-center px-4 py-32">
          <span className="size-8 animate-spin rounded-full border-2 border-white/40 border-r-transparent" />
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
        <BackgroundShader palette="brand" speed={0.4} />
        <div className="relative mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-black">Tu carrito está vacío</h1>
          <Link
            href="/productos"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900"
          >
            Ver catálogo
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  const showUcIframe = form.method === "tarjeta" && captureContext && sdkUrl;

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="brand" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">Inicio</Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <Link href="/carrito" className="hover:text-accent-300">Carrito</Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <Link href="/checkout" className="hover:text-accent-300">Envío</Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">Pago</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight drop-shadow md:text-4xl">
            Método de pago
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Elegí cómo querés pagar tu pedido.
          </p>
        </div>

        <CheckoutStepper current={2} />

        <form
          onSubmit={form.method === "tarjeta" ? (e) => e.preventDefault() : onSubmitOffline}
          className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]"
        >
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
              <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-500/20 text-accent-300 ring-1 ring-accent-400/30">
                  <Lock className="size-4" />
                </span>
                Método
              </h3>
              <div className="grid gap-3">
                {METHODS.map((m) => {
                  const selected = form.method === m.id;
                  const Icon = m.Icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, method: m.id });
                        setCaptureContext(null);
                        setError(null);
                      }}
                      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-accent-400 bg-accent-500/15 ring-2 ring-accent-400/40"
                          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex size-10 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-accent-500 text-ink-900"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white">{m.label}</div>
                          <div className="mt-0.5 text-xs text-white/70">{m.desc}</div>
                        </div>
                      </div>
                      <span
                        className={`size-4 shrink-0 rounded-full ring-2 ${
                          selected
                            ? "bg-accent-500 ring-accent-300"
                            : "bg-transparent ring-white/40"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </section>

            <motion.section
              key={form.method + (showUcIframe ? "-uc" : "")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl"
            >
              {form.method === "tarjeta" && !showUcIframe && (
                <div className="text-sm text-white/85">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-white">
                    Pago con tarjeta
                  </h3>
                  <p className="text-white/70">
                    Aceptamos Visa, Mastercard y American Express. El pago se procesa
                    de forma segura en la pasarela de BAC con verificación 3-D Secure.
                  </p>
                  <p className="mt-3 text-xs text-white/55">
                    Al continuar se creará tu pedido y se abrirá la pasarela segura.
                    Tus datos de tarjeta nunca pasan por nuestros servidores.
                  </p>
                </div>
              )}

              {showUcIframe && captureContext && sdkUrl && (
                <>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
                    Ingresá los datos de tu tarjeta
                  </h3>
                  <UnifiedCheckout
                    sdkUrl={sdkUrl}
                    sdkIntegrity={sdkIntegrity}
                    captureContext={captureContext}
                    onToken={onTransientToken}
                    onError={(msg) => {
                      setError(msg);
                      setSubmitting(false);
                    }}
                  />
                </>
              )}

              {form.method === "sinpe" && (
                <>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
                    SINPE Móvil
                  </h3>
                  <div className="rounded-2xl border border-accent-400/30 bg-accent-500/10 p-5 text-sm leading-relaxed text-white/90">
                    <div className="flex items-center justify-between border-b border-white/15 pb-3">
                      <span className="text-xs uppercase tracking-wider text-white/60">Enviar a</span>
                      <span className="font-mono text-base font-black text-accent-300">8888-8888</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/15 py-3">
                      <span className="text-xs uppercase tracking-wider text-white/60">Cédula jurídica</span>
                      <span className="font-mono text-sm font-bold">3-101-XXXXXX</span>
                    </div>
                    <div className="flex items-center justify-between pt-3">
                      <span className="text-xs uppercase tracking-wider text-white/60">Monto</span>
                      <span className="text-base font-black tabular-nums text-accent-300">
                        {formatCRC(total)}
                      </span>
                    </div>
                  </div>
                  <Field
                    label="Teléfono desde el que enviás SINPE"
                    value={form.sinpePhone}
                    onChange={(v) =>
                      setForm({ ...form, sinpePhone: v.replace(/[^\d-]/g, "").slice(0, 9) })
                    }
                    placeholder="8888-8888"
                    required
                    inputMode="tel"
                    className="mt-5"
                  />
                  <p className="mt-3 text-xs text-white/60">
                    Confirmaremos tu pago manualmente en menos de 30 minutos en horario laboral.
                  </p>
                </>
              )}

              {form.method === "transferencia" && (
                <>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
                    Datos bancarios
                  </h3>
                  <ul className="space-y-3 text-sm">
                    {[
                      { bank: "BAC Credomatic", acc: "CR05 1010 0001 2345 6789 01" },
                      { bank: "Banco Nacional", acc: "CR12 1510 0001 9876 5432 10" },
                      { bank: "BCR", acc: "CR99 1520 0001 5555 4444 33" },
                    ].map((b) => (
                      <li
                        key={b.bank}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 p-4"
                      >
                        <div>
                          <div className="text-xs uppercase tracking-wider text-white/60">{b.bank}</div>
                          <div className="mt-1 font-mono text-sm text-white">{b.acc}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-white/60">
                    Enviá el comprobante al WhatsApp 8888-8888 con el número de orden.
                  </p>
                </>
              )}
            </motion.section>

            <section className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
                  className="mt-1 size-5 shrink-0 cursor-pointer accent-accent-500"
                  required
                />
                <span className="text-sm text-white/85">
                  Acepto los{" "}
                  <Link href="/terminos" className="font-bold text-accent-300 underline-offset-4 hover:underline">
                    términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" className="font-bold text-accent-300 underline-offset-4 hover:underline">
                    política de privacidad
                  </Link>{" "}
                  de ICB Tech.
                </span>
              </label>
            </section>

            <Link
              href="/checkout"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-accent-300"
            >
              <ArrowLeft className="size-4" />
              Volver a envío
            </Link>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl"
            >
              <h2 className="text-lg font-black">Resumen</h2>
              {shipping && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/80">
                  <div className="font-bold text-white">{shipping.fullName}</div>
                  <div className="mt-0.5 text-white/70">
                    {shipping.address}, {shipping.canton}, {shipping.province}
                  </div>
                </div>
              )}
              <ul className="mt-4 max-h-60 space-y-3 overflow-auto pr-2 text-sm">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-xs font-semibold text-white">{it.name}</div>
                      <div className="mt-0.5 text-[11px] text-white/60">x{it.qty}</div>
                    </div>
                    <div className="text-sm font-bold tabular-nums">
                      {formatCRC(it.qty * it.unitPrice)}
                    </div>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 border-t border-white/15 pt-4 text-sm">
                <Row label="Subtotal" value={formatCRC(subtotal)} />
                <Row
                  label="Envío"
                  value={shippingCost === 0 ? "Gratis" : formatCRC(shippingCost)}
                  highlight={shippingCost === 0}
                />
                <div className="mt-2 flex items-end justify-between border-t border-white/15 pt-3">
                  <div>
                    <dt className="text-sm font-bold">Total</dt>
                    <span className="text-[11px] text-white/60">IVA incluido (13%)</span>
                  </div>
                  <dd className="text-2xl font-black tabular-nums">{formatCRC(total)}</dd>
                </div>
              </dl>

              {error && (
                <p className="mt-4 rounded-xl border border-red-300/40 bg-red-500/15 px-3 py-2 text-xs text-red-100">
                  {error}
                </p>
              )}

              {form.method === "tarjeta" ? (
                !showUcIframe && (
                  <button
                    type="button"
                    onClick={startCardFlow}
                    disabled={!form.acceptTerms || submitting}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50 disabled:shadow-none"
                  >
                    {submitting ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        Preparando pasarela…
                      </>
                    ) : (
                      <>
                        Continuar al pago seguro
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                )
              ) : (
                <button
                  type="submit"
                  disabled={!form.acceptTerms || submitting}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50 disabled:shadow-none"
                >
                  {submitting ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Confirmar pedido
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/60">
                <ShieldCheck className="size-3.5 text-accent-400" />
                Pago seguro · Encriptación SSL
              </div>
            </motion.div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-white/70">
        {label}
        {required && <span className="ml-1 text-accent-400">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none backdrop-blur transition-colors placeholder:text-white/40 focus:border-accent-400"
      />
    </label>
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
