"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ArrowRight, Truck, MapPin, Mail, Phone, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCRC } from "@/lib/utils";
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
      <div className="bg-white">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-black text-ink-900">Tu carrito está vacío</h1>
          <p className="mt-2 text-ink-500">
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
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-ink-500">
          <Link href="/" className="hover:text-brand-600">Inicio</Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <Link href="/carrito" className="hover:text-brand-600">Carrito</Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <span className="text-ink-900">Envío</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-ink-900 md:text-4xl">
            Datos de envío
          </h1>
          <p className="mt-1 text-sm text-ink-500">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-600">
                    Provincia
                  </label>
                  <select
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p} className="bg-white">
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
                          ? "border-accent-500 bg-accent-50 ring-2 ring-accent-500/30"
                          : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-ink-900">{o.label}</div>
                        <div className="mt-0.5 text-xs text-ink-500">{o.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black tabular-nums text-ink-900">
                          {o.price === 0 ? "Gratis" : formatCRC(o.price)}
                        </div>
                        <div
                          className={`mt-1 inline-block size-4 rounded-full ring-2 ${
                            selected
                              ? "bg-accent-500 ring-accent-300"
                              : "bg-transparent ring-ink-300"
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
              className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-black text-ink-900">Tu pedido</h2>
              <ul className="mt-4 max-h-72 space-y-3 overflow-auto pr-2 text-sm">
                {items.map((it) => (
                  <li key={it.id} className="flex items-start justify-between gap-3 border-b border-ink-200 pb-3 last:border-0">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-xs font-semibold text-ink-900">
                        {it.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-500">
                        x{it.qty} · {formatCRC(it.unitPrice)}
                      </div>
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
                  <dd className="text-2xl font-black tabular-nums text-ink-900">
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
    <section className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-900">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-100 text-accent-700 ring-1 ring-accent-200">
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
      <span className="text-xs font-bold uppercase tracking-wider text-ink-600">
        {label}
        {required && <span className="ml-1 text-accent-600">*</span>}
      </span>
      <div className="relative mt-1">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        )}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-ink-200 bg-white py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 ${
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
      <dt className="text-ink-500">{label}</dt>
      <dd className={`font-semibold tabular-nums ${highlight ? "text-accent-700" : "text-ink-900"}`}>
        {value}
      </dd>
    </div>
  );
}
