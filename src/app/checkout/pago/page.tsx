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
import { CheckoutStepper } from "@/components/CheckoutStepper";
import { UnifiedCheckout } from "@/components/UnifiedCheckout";
import {
  getZone,
  zoneRate,
  distanceShippingCost,
  type PackageSize,
} from "@/lib/shipping";

const SHIPPING_KEY = "icb-checkout-v3";
const PAYMENT_KEY = "icb-payment-v1";

type Method = "tarjeta" | "sinpe" | "transferencia";

type PaymentForm = {
  method: Method;
  sinpePhone: string;
  payerName: string;
  acceptTerms: boolean;
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
  method: "recogida" | "envio" | "encomienda";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  province: string;
  canton: string;
  postalCode: string;
  address: string;
  reference: string;
  lat: number | null;
  lng: number | null;
  zoneId: string;
  size: PackageSize;
};

const SHIPPING_LABELS: Record<string, string> = {
  recogida: "Recogida en sucursal",
  envio: "Envío a domicilio",
  encomienda: "Encomienda",
};

export default function PagoPage() {
  const router = useRouter();
  const { items, subtotal, count } = useCart();
  const [shipping, setShipping] = useState<Shipping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>({
    method: "tarjeta",
    sinpePhone: "",
    payerName: "",
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

  const shippingZone = shipping ? getZone(shipping.zoneId) : undefined;
  const shippingCost =
    !shipping || shipping.method === "recogida"
      ? 0
      : shipping.method === "encomienda"
        ? shippingZone
          ? zoneRate(shippingZone, shipping.size)
          : 0
        : distanceShippingCost(shipping.lat, shipping.lng);
  const total = subtotal + shippingCost;

  async function createOrder(): Promise<{ orderId: string; orderNumber: string } | null> {
    if (!shipping) return null;
    const fullName = `${shipping.firstName} ${shipping.lastName}`.trim();
    const noteParts = [shipping.reference?.trim()].filter(Boolean) as string[];
    // Para SINPE/transferencia, dejar registrado a nombre de quién se pagó.
    if (
      (form.method === "sinpe" || form.method === "transferencia") &&
      form.payerName.trim()
    ) {
      noteParts.push(`Pago (${form.method}) a nombre de: ${form.payerName.trim()}`);
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((it) => ({ id: it.id, qty: it.qty })),
        customer: {
          name: fullName,
          email: shipping.email,
          phone: shipping.phone,
          idNumber: shipping.idNumber,
        },
        shipping: {
          province: shipping.province,
          canton: shipping.canton,
          address: shipping.address,
          method: shipping.method,
          notes: noteParts.join(" · "),
          lat: shipping.lat,
          lng: shipping.lng,
          zoneId: shipping.zoneId,
          size: shipping.size,
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
        shipping: {
          fullName,
          email: shipping.email,
          phone: shipping.phone,
          province: shipping.province,
          canton: shipping.canton,
          address: shipping.address,
          method: shipping.method,
        },
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
        sessionJwt: string;
        clientLibrary: string | null;
        clientLibraryIntegrity: string | null;
        debugPayload?: unknown;
      };
      console.log("[UC] session JWT payload:", ccJson.debugPayload);
      if (!ccJson.clientLibrary) {
        setError(
          "Cybersource no devolvió la URL del SDK. Verifica que el sessions API esté habilitado."
        );
        setSubmitting(false);
        return;
      }
      setCaptureContext(ccJson.sessionJwt);
      setSdkUrl(ccJson.clientLibrary);
      setSdkIntegrity(ccJson.clientLibraryIntegrity);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  // Cuando UC termina, devuelve un JWT con el resultado del pago (autoProcessing).
  async function onResultJwt(resultJwt: string) {
    if (!orderId) return;
    setError(null);
    try {
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, resultJwt }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        status?: string;
        reasonCode?: string;
        payload?: unknown;
      };
      console.log("[PAY] /confirm response:", data);
      if (!res.ok || !data.ok) {
        setError(data.message ?? `Pago rechazado (${data.status ?? res.status})`);
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
      <div className="bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-32">
          <span className="size-8 animate-spin rounded-full border-2 border-ink-300 border-r-transparent" />
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-white">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-black text-ink-900">Tu carrito está vacío</h1>
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
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-ink-500">
          <Link href="/" className="hover:text-brand-600">Inicio</Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <Link href="/carrito" className="hover:text-brand-600">Carrito</Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <Link href="/checkout" className="hover:text-brand-600">Envío</Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <span className="text-ink-900">Pago</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-ink-900 md:text-4xl">
            Método de pago
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Elegí cómo querés pagar tu pedido.
          </p>
        </div>

        <CheckoutStepper current={2} />

        <form
          onSubmit={form.method === "tarjeta" ? (e) => e.preventDefault() : onSubmitOffline}
          className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]"
        >
          <div className="space-y-6">
            <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-900">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-100 text-accent-700 ring-1 ring-accent-200">
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
                          ? "border-accent-500 bg-accent-50 ring-2 ring-accent-500/30"
                          : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex size-10 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-accent-500 text-ink-900"
                              : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <div className="text-sm font-bold text-ink-900">{m.label}</div>
                          <div className="mt-0.5 text-xs text-ink-500">{m.desc}</div>
                        </div>
                      </div>
                      <span
                        className={`size-4 shrink-0 rounded-full ring-2 ${
                          selected
                            ? "bg-accent-500 ring-accent-300"
                            : "bg-transparent ring-ink-300"
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
              className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm"
            >
              {showUcIframe && captureContext && sdkUrl && (
                <>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-900">
                    Ingresá los datos de tu tarjeta
                  </h3>
                  <UnifiedCheckout
                    sdkUrl={sdkUrl}
                    sdkIntegrity={sdkIntegrity}
                    sessionJwt={captureContext}
                    onResult={onResultJwt}
                    onError={(msg) => {
                      setError(msg);
                      setSubmitting(false);
                    }}
                  />
                </>
              )}

              {form.method === "sinpe" && (
                <>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-900">
                    SINPE Móvil
                  </h3>
                  <div className="rounded-2xl border border-accent-200 bg-accent-50 p-5 text-sm leading-relaxed text-ink-700">
                    <div className="flex items-center justify-between border-b border-accent-200 pb-3">
                      <span className="text-xs uppercase tracking-wider text-ink-500">Enviar a</span>
                      <span className="font-mono text-base font-black text-accent-700">8960 8298</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-accent-200 py-3">
                      <span className="text-xs uppercase tracking-wider text-ink-500">A nombre de</span>
                      <span className="text-sm font-bold text-ink-900">ICB TECHNOLOGIES SRL</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-accent-200 py-3">
                      <span className="text-xs uppercase tracking-wider text-ink-500">Cédula jurídica</span>
                      <span className="font-mono text-sm font-bold text-ink-900">3-102-742735</span>
                    </div>
                    <div className="flex items-center justify-between pt-3">
                      <span className="text-xs uppercase tracking-wider text-ink-500">Monto</span>
                      <span className="text-base font-black tabular-nums text-accent-700">
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
                  <Field
                    label="Nombre de quien efectúa el SINPE"
                    value={form.payerName}
                    onChange={(v) => setForm({ ...form, payerName: v })}
                    placeholder="Nombre exacto del titular del SINPE"
                    required
                    className="mt-4"
                  />
                  <p className="mt-1 text-[11px] text-ink-400">
                    Por favor escribí el nombre exacto al que aparece el SINPE Móvil.
                  </p>
                  <p className="mt-3 text-xs text-ink-500">
                    Confirmaremos tu pago manualmente en menos de 30 minutos en horario laboral.
                  </p>
                </>
              )}

              {form.method === "transferencia" && (
                <>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-900">
                    Datos bancarios
                  </h3>
                  <ul className="space-y-3 text-sm">
                    {[
                      { bank: "BAC Credomatic", iban: "CR39010200009370805391" },
                      { bank: "Banco Nacional", iban: "CR03015112320010312817" },
                      { bank: "BCR", iban: null },
                    ].map((b) => (
                      <li
                        key={b.bank}
                        className="rounded-xl border border-ink-200 bg-ink-50 p-4"
                      >
                        <div className="text-xs font-bold uppercase tracking-wider text-ink-500">
                          {b.bank}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-ink-900">
                          ICB TECHNOLOGIES SRL
                        </div>
                        <div className="text-xs text-ink-600">
                          Cédula jurídica:{" "}
                          <span className="font-mono text-ink-900">3-102-742735</span>
                        </div>
                        {b.iban && (
                          <div className="mt-1 text-sm">
                            <span className="text-xs text-ink-500">IBAN: </span>
                            <span className="font-mono text-ink-900">{b.iban}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Field
                    label="Nombre de quien efectúa el depósito"
                    value={form.payerName}
                    onChange={(v) => setForm({ ...form, payerName: v })}
                    placeholder="Nombre exacto del titular de la cuenta"
                    required
                    className="mt-4"
                  />
                  <p className="mt-4 text-xs text-ink-500">
                    Enviá el comprobante al WhatsApp 8888-8888 con el número de orden.
                  </p>
                </>
              )}
            </motion.section>

            <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
                  className="mt-1 size-5 shrink-0 cursor-pointer accent-accent-500"
                  required
                />
                <span className="text-sm text-ink-600">
                  Acepto los{" "}
                  <Link href="/terminos" className="font-bold text-brand-600 underline-offset-4 hover:underline">
                    términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" className="font-bold text-brand-600 underline-offset-4 hover:underline">
                    política de privacidad
                  </Link>{" "}
                  de ICB Tech.
                </span>
              </label>
            </section>

            <Link
              href="/checkout"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-brand-600"
            >
              <ArrowLeft className="size-4" />
              Volver a envío
            </Link>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-black text-ink-900">Resumen</h2>
              {shipping && (
                <div className="mt-3 rounded-2xl border border-ink-200 bg-ink-50 p-3 text-xs text-ink-600">
                  <div className="font-bold text-ink-900">
                    {`${shipping.firstName} ${shipping.lastName}`.trim()}
                  </div>
                  <div className="mt-0.5 text-ink-500">
                    {shipping.address}, {shipping.canton}, {shipping.province}
                  </div>
                  <div className="mt-1 font-semibold text-brand-600">
                    {SHIPPING_LABELS[shipping.method] ?? shipping.method}
                    {shipping.method === "encomienda" && shippingZone
                      ? ` · ${shippingZone.label}`
                      : ""}
                  </div>
                </div>
              )}
              <ul className="mt-4 max-h-60 space-y-3 overflow-auto pr-2 text-sm">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start justify-between gap-3 border-b border-ink-200 pb-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-xs font-semibold text-ink-900">{it.name}</div>
                      <div className="mt-0.5 text-[11px] text-ink-500">x{it.qty}</div>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-ink-900">
                      {formatCRC(it.qty * it.unitPrice)}
                    </div>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm">
                <Row label="Subtotal" value={formatCRC(subtotal)} />
                <Row
                  label="Envío"
                  value={shippingCost === 0 ? "Gratis" : formatCRC(shippingCost)}
                  highlight={shippingCost === 0}
                />
                <div className="mt-2 flex items-end justify-between border-t border-ink-200 pt-3">
                  <div>
                    <dt className="text-sm font-bold text-ink-900">Total</dt>
                    <span className="text-[11px] text-ink-400">IVA incluido (13%)</span>
                  </div>
                  <dd className="text-2xl font-black tabular-nums text-ink-900">{formatCRC(total)}</dd>
                </div>
              </dl>

              {error && (
                <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}

              {form.method === "tarjeta" ? (
                !showUcIframe && (
                  <button
                    type="button"
                    onClick={startCardFlow}
                    disabled={!form.acceptTerms || submitting}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400 disabled:shadow-none"
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
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400 disabled:shadow-none"
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

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-ink-500">
                <ShieldCheck className="size-3.5 text-accent-600" />
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
      <span className="text-xs font-bold uppercase tracking-wider text-ink-600">
        {label}
        {required && <span className="ml-1 text-accent-600">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500"
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
      <dt className="text-ink-500">{label}</dt>
      <dd
        className={`font-semibold tabular-nums ${
          highlight ? "text-accent-700" : "text-ink-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
