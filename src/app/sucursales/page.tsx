import Link from "next/link";
import { ChevronRight, MapPin, Navigation, Building2 } from "lucide-react";
import { BackgroundShader } from "@/components/ui/background-shader";
import { ProductTabs } from "@/components/ProductTabs";

export const metadata = {
  title: "Sucursales — ICB Technologies",
  description:
    "Visitanos en San José, Alajuela, Heredia, Cartago, Ciudad Quesada y nuestro CEDI en Barreal de Heredia.",
};

type Location = {
  id: string;
  city: string;
  name: string;
  address: string;
  gmaps: string;
  waze: string;
};

const BRANCHES: Location[] = [
  {
    id: "san-jose",
    city: "San José",
    name: "ICB Technologies San José",
    address:
      "Avenida 8, 225 metros al oeste de la entrada principal del Hospital Blanco Cervantes.",
    gmaps: "https://maps.app.goo.gl/jiFaqx8dqgj7ZUf48",
    waze: "https://ul.waze.com/ul?place=ChIJO_PZVlrjoI8R2YTgz9-y8Yo&ll=9.93111000%2C-84.08862750&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "alajuela",
    city: "Alajuela",
    name: "ICB Technologies Alajuela",
    address:
      "Rio Segundo, Alajuela, Avenida 8. 100 metros al norte del KFC de la radial.",
    gmaps: "https://maps.app.goo.gl/CrJDb1hYDFCgYieg8",
    waze: "https://ul.waze.com/ul?venue_id=180748388.1807418345.25237283&overview=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "heredia",
    city: "Heredia",
    name: "ICB Technologies Heredia",
    address:
      "Corazón de Jesús, Heredia. Costado Sur de la Biblioteca pública de Heredia. Frente al INA.",
    gmaps: "https://maps.app.goo.gl/UannZMobJRLRWmrDA",
    waze: "https://ul.waze.com/ul?place=ChIJga-nT3jwoI8RpuCwmNb-yRo&ll=10.00107310%2C-84.11404830&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "cartago",
    city: "Cartago",
    name: "ICB Technologies Cartago",
    address: "Boulevard el Molino, segundo piso, a mano izquierda. Local #9.",
    gmaps: "https://maps.app.goo.gl/AVNN5RFG5w2T9fTv8",
    waze: "https://ul.waze.com/ul?place=ChIJL_zCzzzfoI8RiUcRV_B3gHU&ll=9.85752580%2C-83.93226830&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "ciudad-quesada",
    city: "Ciudad Quesada",
    name: "ICB Technologies Ciudad Quesada",
    address:
      "Ciudad Quesada, San Carlos. Contiguo a la casa Cural. Plaza comercial Casazul, local al fondo.",
    gmaps: "https://maps.app.goo.gl/tAfXJkaFGKvPWe4e8",
    waze: "https://ul.waze.com/ul?place=ChIJDYj1qtploI8RSCjHXKD_9S0&ll=10.32251470%2C-84.42956790&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
];

const CEDI: Location = {
  id: "cedi-barreal",
  city: "Barreal de Heredia",
  name: "CEDI Barreal de Heredia",
  address: "Barreal, Heredia, ModyPlaza Local 14, frente a CENADA.",
  gmaps: "https://maps.app.goo.gl/jatydzHVitGKQ4Av6",
  waze: "https://ul.waze.com/ul?place=ChIJm49cynz972gRUN6acuCstkI&ll=9.98128420%2C-84.15138520&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
};

function LocationCard({ loc, badge }: { loc: Location; badge?: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {badge && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-300">
              {badge}
            </span>
          )}
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
            {loc.name}
          </h2>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-white/85 md:text-base">
        <MapPin className="mt-0.5 size-4 shrink-0 text-accent-400" />
        {loc.address}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={loc.gmaps}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition hover:bg-accent-400"
        >
          <Navigation className="size-4" />
          Google Maps
        </a>
        <a
          href={loc.waze}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
        >
          <Navigation className="size-4" />
          Waze
        </a>
      </div>
    </div>
  );
}

export default function SucursalesPage() {
  const tabs = [
    ...BRANCHES.map((b) => ({
      id: b.id,
      label: b.city,
      content: <LocationCard loc={b} badge="Sucursal" />,
    })),
    {
      id: CEDI.id,
      label: "CEDI",
      content: <LocationCard loc={CEDI} badge="Centro de distribución" />,
    },
  ];

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="ocean" speed={0.4} />

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">Sucursales</span>
        </nav>

        <header className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-accent-300 backdrop-blur-md">
            <Building2 className="size-3.5" />
            5 sucursales + 1 CEDI
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight drop-shadow md:text-5xl">
            ¿Dónde estamos ubicados?
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75 md:text-base">
            Apersonate a cualquiera de nuestros puntos físicos o solicitá
            despacho desde nuestro CEDI. También ofrecemos mensajería GAM y
            envíos a todo Costa Rica.
          </p>
        </header>

        <ProductTabs tabs={tabs} />
      </div>
    </div>
  );
}
