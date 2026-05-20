import { Truck, ShieldCheck, Headphones, CreditCard } from "lucide-react";

const FEATURES = [
  {
    Icon: Truck,
    title: "Envíos a todo el país",
    desc: "Despacho rápido y seguro en 24-48h",
  },
  {
    Icon: ShieldCheck,
    title: "Garantía oficial",
    desc: "Productos respaldados de fábrica",
  },
  {
    Icon: Headphones,
    title: "Soporte técnico",
    desc: "Asesoría antes y después de tu compra",
  },
  {
    Icon: CreditCard,
    title: "Pago seguro",
    desc: "SINPE, tarjetas y cuotas disponibles",
  },
];

export function FeatureStrip() {
  return (
    <section className="border-y border-ink-200 bg-ink-50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-ink-200 md:grid-cols-4">
        {FEATURES.map(({ Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 bg-ink-50 p-5 transition-colors hover:bg-white"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink-900">{title}</div>
              <div className="mt-0.5 text-xs text-ink-500">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
