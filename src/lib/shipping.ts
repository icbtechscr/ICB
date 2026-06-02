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

export function zoneRate(zone: ShippingZone, size: PackageSize): number {
  return size === "carro" ? zone.carRate : zone.motoRate;
}
