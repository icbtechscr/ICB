// Zonas y tarifas de encomienda en Costa Rica.
// Basado en el Excel "encomiendas_costa_rica.xlsx".
// Cada zona tiene dos tarifas: pedido pequeño (cabe en motocicleta) o grande
// (requiere carro). El cliente elige zona + tamaño y se calcula el costo.

export type PackageSize = "moto" | "carro";

export type ShippingZone = {
  id: string;
  label: string; // nombre amigable para el selector
  service: string; // encomienda recomendada
  coverage: string; // descripción de cobertura
  motoRate: number;
  carRate: number;
};

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "nacional",
    label: "Nacional (GAM y todo el país)",
    service: "Correos de Costa Rica",
    coverage: "Cobertura nacional: GAM y resto del país.",
    motoRate: 8000,
    carRate: 10000,
  },
  {
    id: "caribe",
    label: "Caribe / Limón",
    service: "Encomiendas Caribeños",
    coverage:
      "Guápiles, Siquirres, Limón, Matina, Guácimo, Pocora, Cariari y zona Caribe.",
    motoRate: 4000,
    carRate: 8000,
  },
  {
    id: "pococi",
    label: "Pococí / Guápiles",
    service: "Encomiendas Guapileños",
    coverage: "Guápiles, Cariari, Roxana, La Rita, Jiménez, Pococí y alrededores.",
    motoRate: 4000,
    carRate: 8000,
  },
  {
    id: "zona-sur",
    label: "Zona Sur / Pacífico Sur",
    service: "TRACOPA",
    coverage:
      "Quepos, Manuel Antonio, Parrita, Uvita, Dominical, Palmar, Golfito, Ciudad Neily, Paso Canoas, Buenos Aires, San Vito.",
    motoRate: 7000,
    carRate: 12000,
  },
  {
    id: "perez-zeledon",
    label: "Pérez Zeledón / Los Santos",
    service: "MUSOC",
    coverage: "San Isidro de Pérez Zeledón, Tarrazú, Dota, León Cortés.",
    motoRate: 4000,
    carRate: 8000,
  },
  {
    id: "puntarenas",
    label: "Puntarenas / Pacífico Central",
    service: "Empresarios Unidos de Puntarenas",
    coverage: "Puntarenas, Esparza, El Roble y San Ramón.",
    motoRate: 4000,
    carRate: 9000,
  },
  {
    id: "guanacaste",
    label: "Guanacaste",
    service: "Curubandé Express / TIG",
    coverage:
      "Liberia, Playas del Coco, Tamarindo, Santa Cruz, Nicoya, Nosara, Cañas, La Cruz y más.",
    motoRate: 5000,
    carRate: 9000,
  },
  {
    id: "zona-norte",
    label: "Zona Norte (San Carlos)",
    service: "Transportes Sancarleños",
    coverage: "Ciudad Quesada, La Fortuna, Guatuso, Pital, Venecia, Zarcero.",
    motoRate: 4000,
    carRate: 8000,
  },
  {
    id: "cartago-turrialba",
    label: "Cartago / Turrialba",
    service: "Transtusa",
    coverage: "Cartago, Paraíso y Turrialba.",
    motoRate: 4000,
    carRate: 8000,
  },
];

export function getZone(id: string | null | undefined): ShippingZone | undefined {
  return SHIPPING_ZONES.find((z) => z.id === id);
}

// Origen de los envíos: ICB San José.
export const ORIGIN = { lat: 9.93111, lng: -84.0886275 };

// Tarifa de envío a domicilio: ₡750 por kilómetro (distancia desde ICB SJ).
export const PER_KM_RATE = 750;

/** Costo de envío a domicilio según la distancia al punto marcado. */
export function distanceShippingCost(
  lat: number | null | undefined,
  lng: number | null | undefined
): number {
  if (typeof lat !== "number" || typeof lng !== "number") return 0;
  const km = Math.max(1, distanceKm(ORIGIN.lat, ORIGIN.lng, lat, lng));
  return km * PER_KM_RATE;
}

// Determina la zona de encomienda a partir de la provincia/cantón
// (obtenidos del reverse-geocoding del punto marcado en el mapa).
export function zoneFromLocation(
  province?: string | null,
  canton?: string | null
): string {
  const p = (province || "").toLowerCase();
  const c = (canton || "").toLowerCase();
  const has = (s: string) => c.includes(s);

  if (p.includes("guanacaste")) return "guanacaste";

  if (p.includes("limón") || p.includes("limon")) {
    if (has("pococí") || has("pococi") || has("guápiles") || has("guapiles"))
      return "pococi";
    return "caribe";
  }

  if (p.includes("puntarenas")) {
    const sur = [
      "osa",
      "golfito",
      "corredores",
      "coto brus",
      "buenos aires",
      "quepos",
      "parrita",
      "garabito",
    ];
    if (sur.some(has)) return "zona-sur";
    return "puntarenas";
  }

  if (p.includes("cartago")) return "cartago-turrialba";

  if (p.includes("san josé") || p.includes("san jose")) {
    const losSantos = [
      "pérez zeledón",
      "perez zeledon",
      "tarrazú",
      "tarrazu",
      "dota",
      "león cortés",
      "leon cortes",
    ];
    if (losSantos.some(has)) return "perez-zeledon";
    return "nacional"; // GAM
  }

  if (p.includes("alajuela")) {
    const norte = [
      "san carlos",
      "quesada",
      "upala",
      "los chiles",
      "guatuso",
      "zarcero",
      "sarchí",
      "sarchi",
      "naranjo",
    ];
    if (norte.some(has)) return "zona-norte";
    return "nacional"; // GAM
  }

  if (p.includes("heredia")) {
    if (has("sarapiquí") || has("sarapiqui")) return "zona-norte";
    return "nacional"; // GAM
  }

  return "nacional";
}

/** Distancia aproximada en km entre dos coordenadas (Haversine). */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function zoneRate(zone: ShippingZone, size: PackageSize): number {
  return size === "carro" ? zone.carRate : zone.motoRate;
}
