"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ArrowRight, Truck, MapPin, Mail, Phone, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCRC } from "@/lib/utils";
import { BackgroundShader } from "@/components/ui/background-shader";
import { CheckoutStepper } from "@/components/CheckoutStepper";

const STORAGE_KEY = "icb-checkout-v1";

type ShippingForm = {
  fullName: string;
  email: string;
  phone: string;
  province: string;
  canton: string;
  address: string;
  notes: string;
  method: "express" | "estandar" | "recogida";
};

const PROVINCES = [
  "San José",
  "Alajuela",
  "Heredia",
  "Cartago",
  "Puntarenas",
  "Guanacaste",
  "Limón",
];

const SHIPPING_OPTIONS = [
  {
    id: "express" as const,
    label: "Express (24h)",
    desc: "Solo GAM, despacho mismo día si pedís antes de las 2 PM",
    price: 4500,
  },
  {
    id: "estandar" as const,
    label: "Estándar (2-4 días)",
    desc: "Envío a todo Costa Rica vía Correos de CR",
    price: 2500,
  },
  {
    id: "recogida" as const,
    label: "Recogida en sucursal",
    desc: "San José centro · Sin costo",
    price: 0,
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, count } = useCart();
  const [form, setForm] = useState<ShippingForm>({
    fullName: "",
    email: "",
    phone: "",
    province: "San José",
    canton: "",
    address: "",
    notes: "",
    method: "estandar",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setForm((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {}
  }, []);

  const shippingCost =
    SHIPPING_OPTIONS.find((o) => o.id === form.method)?.price ?? 0;
  const total = subtotal + shippingCost;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
    router.push("/checkout/pago");
  }

  if (count === 0) {
    return (
      <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
        <BackgroundShader palette="brand" speed={0.4} />
        <div className="relative mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-black">Tu carrito está vacío</h1>
          <p className="mt-2 text-white/70">
            Agregá productos antes de continuar al checkout.
          </p>
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

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="brand" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">Inicio</Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <Link href="/carrito" className="hover:text-accent-300">Carrito</Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">Envío</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight drop-shadow md:text-4xl">
            Datos de envío
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Necesitamos saber dónde entregar tu pedido.
          </p>
        </div>

        <CheckoutStepper current={1} />

        <form onSubmit={onSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Card title="Información personal" Icon={User}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre completo"
                  value={form.fullName}
                  required
                  onChange={(v) => setForm({ ...form, fullName: v })}
                />
                <Field
                  label="Cédula"
                  value={form.notes.split("||")[0] ?? ""}
                  onChange={(v) => setForm({ ...form, notes: `${v}||${form.notes.split("||")[1] ?? ""}` })}
                />
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  required
                  Icon={Mail}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
                <Field
                  label="Teléfono"
                  type="tel"
                  value={form.phone}
                  required
                  Icon={Phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                />
              </div>
            </Card>

            <Card title="Dirección de entrega" Icon={MapPin}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Provincia
                  </label>
                  <select
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none backdrop-blur focus:border-accent-400"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p} className="bg-ink-900">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Cantón"
                  value={form.canton}
                  required
                  onChange={(v) => setForm({ ...form, canton: v })}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Dirección exacta"
                    value={form.address}
                    required
                    onChange={(v) => setForm({ ...form, address: v })}
                  />
                </div>
              </div>
            </Card>

            <Card title="Método de envío" Icon={Truck}>
              <div className="grid gap-3">
                {SHIPPING_OPTIONS.map((o) => {
                  const selected = form.method === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setForm({ ...form, method: o.id })}
                      className={`group flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-accent-400 bg-accent-500/15 ring-2 ring-accent-400/40"
                          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{o.label}</div>
                        <div className="mt-0.5 text-xs text-white/70">{o.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black tabular-nums text-white">
                          {o.price === 0 ? "Gratis" : formatCRC(o.price)}
                        </div>
                        <div
                          className={`mt-1 inline-block size-4 rounded-full ring-2 ${
                            selected
                              ? "bg-accent-500 ring-accent-300"
                              : "bg-transparent ring-white/40"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl"
            >
              <h2 className="text-lg font-black">Tu pedido</h2>
              <ul className="mt-4 max-h-72 space-y-3 overflow-auto pr-2 text-sm">
                {items.map((it) => (
                  <li key={it.id} className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 last:border-0">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-xs font-semibold text-white">
                        {it.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-white/60">
                        x{it.qty} · {formatCRC(it.unitPrice)}
                      </div>
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
                  <dd className="text-2xl font-black tabular-nums">
                    {formatCRC(total)}
                  </dd>
                </div>
              </dl>

              <button
                type="submit"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 active:scale-95"
              >
                Continuar al pago
                <ArrowRight className="size-4" />
              </button>
            </motion.div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function Card({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
      <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-500/20 text-accent-300 ring-1 ring-accent-400/30">
          <Icon className="size-4" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-white/70">
        {label}
        {required && <span className="ml-1 text-accent-400">*</span>}
      </span>
      <div className="relative mt-1">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
        )}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-white/20 bg-white/10 py-3 text-sm text-white outline-none backdrop-blur transition-colors placeholder:text-white/40 focus:border-accent-400 ${
            Icon ? "pl-10 pr-4" : "px-4"
          }`}
        />
      </div>
    </label>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-white/70">{label}</dt>
      <dd className={`font-semibold tabular-nums ${highlight ? "text-accent-300" : "text-white"}`}>
        {value}
      </dd>
    </div>
  );
}
