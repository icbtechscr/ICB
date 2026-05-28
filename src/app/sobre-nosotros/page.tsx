import Link from "next/link";
import { ChevronRight, ShieldCheck, Truck, Sparkles, Building2, Headphones, Award } from "lucide-react";

export const metadata = {
  title: "Sobre nosotros — ICB Technologies",
  description:
    "Organización 100% costarricense con más de 20 años de experiencia en el comercio de tecnología.",
};

export default function SobreNosotrosPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-ink-500">
          <Link href="/" className="hover:text-brand-600">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <span className="text-ink-900">Sobre nosotros</span>
        </nav>

        <header className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
            <Sparkles className="size-3.5" />
            100% costarricense · +20 años
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ink-900 md:text-5xl">
            ¿Quiénes somos?
          </h1>
        </header>

        <article className="space-y-5 rounded-3xl border border-ink-200 bg-white p-6 text-base leading-relaxed text-ink-600 shadow-sm md:p-10">
          <p>
            Somos una organización 100% costarricense con más de 20 años de
            experiencia en el mercado del comercio de tecnología. Estamos
            activamente comprometidos con brindar soluciones confiables,
            competitivas y de alta calidad.
          </p>
          <p>
            Contamos con una serie de puntos físicos donde usted puede
            apersonarse a hacer efectiva su compra. Así como CEDI&apos;s (Centro
            de Distribución) donde también le despachamos su pedido.
          </p>
          <p>
            Abonado a lo previamente mencionado, ofrecemos servicio de
            mensajería dentro del Gran Área Metropolitana (GAM) y envíos a todo
            el país mediante la encomienda de su preferencia. Ambas modalidades
            por un pequeño recargo adicional según el caso.
          </p>
          <p>
            Nuestra filosofía de trabajo radica en ser eficientes, con el
            objetivo principal de trasladar el beneficio percibido directamente
            a nuestros clientes mediante precios altamente competitivos. Lo
            anterior, de la mano con nuestro servicio de entregas altamente
            efectivo, nos permite colocar en sus manos el producto adquirido
            rápidamente y con un gran servicio.
          </p>
          <p>
            Todo lo anteriormente mencionado, nos brinda la oportunidad de
            ofrecer productos de las marcas más reconocidas a nivel mundial,
            con el respaldo formal de las fábricas correspondientes.
          </p>
        </article>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Award, title: "+20 años", desc: "En el mercado tecnológico costarricense" },
            { Icon: Building2, title: "5 sucursales", desc: "+ CEDI propio en Barreal de Heredia" },
            { Icon: Truck, title: "Envíos GAM + país", desc: "Mensajería propia y encomiendas" },
            { Icon: ShieldCheck, title: "Marcas oficiales", desc: "Respaldo formal de fábrica" },
          ].map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm transition-colors hover:border-accent-500/50 hover:bg-ink-50"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 ring-1 ring-accent-200">
                <Icon className="size-5" />
              </div>
              <div className="mt-3 text-sm font-bold text-ink-900">{title}</div>
              <div className="mt-1 text-xs text-ink-500">{desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/sucursales"
            className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition hover:bg-accent-400"
          >
            <Building2 className="size-4" />
            Ver sucursales
          </Link>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-6 py-3 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
          >
            <Headphones className="size-4" />
            Explorar catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
