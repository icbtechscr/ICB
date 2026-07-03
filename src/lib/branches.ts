// Sucursales de ICB Technologies + CEDI.
// Fuente de verdad compartida por: página /sucursales, footer y el sistema
// de marcaje de horario (control de colaboradores).
//
// Las coordenadas se usan para verificar dónde marcó cada colaborador.
// La mayoría se extrajeron de los enlaces de Waze (parámetro `ll=`).
// Coordenadas verificadas contra los enlaces oficiales de Google Maps/Waze.

export type Branch = {
  id: string;
  city: string;
  name: string;
  address: string;
  /** Teléfono de la sucursal. TODO: confirmar números reales por sede. */
  phone: string;
  lat: number;
  lng: number;
  gmaps: string;
  waze: string;
  /** true para el centro de distribución (no es sucursal de atención). */
  cedi?: boolean;
  /** true para "Trabajo remoto": marca verde desde cualquier lugar. */
  remote?: boolean;
  /** Hora de entrada esperada (HH:MM, hora CR) para calcular puntualidad.
   *  Si no se define, se usa DEFAULT_ENTRY_TIME. */
  entryTime?: string;
};

/** Hora de entrada por defecto si la sucursal no define una. */
export const DEFAULT_ENTRY_TIME = "08:30";
/** Minutos de tolerancia antes de contar como "tarde". */
export const ENTRY_GRACE_MIN = 10;

/** Hora de entrada esperada (HH:MM) de una sucursal. */
export function getBranchEntryTime(id: string | null | undefined): string {
  const b = id ? BRANCHES.find((x) => x.id === id) : undefined;
  return b?.entryTime || DEFAULT_ENTRY_TIME;
}

export const BRANCHES: Branch[] = [
  {
    id: "san-jose",
    city: "San José",
    name: "ICB Technologies San José",
    address:
      "Avenida 8, 225 metros al oeste de la entrada principal del Hospital Blanco Cervantes.",
    phone: "+506 4001 6421",
    lat: 9.93111,
    lng: -84.0886275,
    gmaps: "https://maps.app.goo.gl/jiFaqx8dqgj7ZUf48",
    waze: "https://ul.waze.com/ul?place=ChIJO_PZVlrjoI8R2YTgz9-y8Yo&ll=9.93111000%2C-84.08862750&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "alajuela",
    city: "Alajuela",
    name: "ICB Technologies Alajuela",
    address:
      "Rio Segundo, Alajuela, Avenida 8. 100 metros al norte del KFC de la radial.",
    phone: "+506 4000 0865",
    lat: 10.0127018,
    lng: -84.2129397,
    gmaps: "https://maps.app.goo.gl/CrJDb1hYDFCgYieg8",
    waze: "https://ul.waze.com/ul?venue_id=180748388.1807418345.25237283&overview=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "heredia",
    city: "Heredia",
    name: "ICB Technologies Heredia",
    address:
      "Corazón de Jesús, Heredia. Costado Sur de la Biblioteca pública de Heredia. Frente al INA.",
    phone: "+506 4001 1931",
    lat: 10.0010731,
    lng: -84.1140483,
    gmaps: "https://maps.app.goo.gl/UannZMobJRLRWmrDA",
    waze: "https://ul.waze.com/ul?place=ChIJga-nT3jwoI8RpuCwmNb-yRo&ll=10.00107310%2C-84.11404830&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "cartago",
    city: "Cartago",
    name: "ICB Technologies Cartago",
    address: "Boulevard el Molino, segundo piso, a mano izquierda. Local #9.",
    phone: "+506 4001 7961",
    lat: 9.8575258,
    lng: -83.9322683,
    gmaps: "https://maps.app.goo.gl/AVNN5RFG5w2T9fTv8",
    waze: "https://ul.waze.com/ul?place=ChIJL_zCzzzfoI8RiUcRV_B3gHU&ll=9.85752580%2C-83.93226830&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "ciudad-quesada",
    city: "Ciudad Quesada",
    name: "ICB Technologies Ciudad Quesada",
    address:
      "Ciudad Quesada, San Carlos. Contiguo a la casa Cural. Plaza comercial Casazul, local al fondo.",
    phone: "+506 4001 6449",
    lat: 10.3225147,
    lng: -84.429679,
    gmaps: "https://maps.app.goo.gl/tAfXJkaFGKvPWe4e8",
    waze: "https://ul.waze.com/ul?place=ChIJDYj1qtploI8RSCjHXKD_9S0&ll=10.32251470%2C-84.42956790&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "cedi-barreal",
    city: "Barreal de Heredia",
    name: "CEDI Barreal de Heredia",
    address: "Barreal, Heredia, ModyPlaza Local 14, frente a CENADA.",
    phone: "+506 4002 5649",
    lat: 9.9812842,
    lng: -84.1513852,
    gmaps: "https://maps.app.goo.gl/jatydzHVitGKQ4Av6",
    waze: "https://ul.waze.com/ul?place=ChIJm49cynz972gRUN6acuCstkI&ll=9.98128420%2C-84.15138520&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
    cedi: true,
  },
];

/** Radio (metros) dentro del cual un marcaje se considera "en sede". */
export const BRANCH_RADIUS_M = 200;

/** "Trabajo remoto": ubicación asignable que marca en verde desde cualquier lado. */
export const REMOTE_LOCATION: Branch = {
  id: "remoto",
  city: "Trabajo remoto",
  name: "Trabajo remoto",
  address: "Desde casa / cualquier lugar",
  phone: "",
  lat: 0,
  lng: 0,
  gmaps: "",
  waze: "",
  remote: true,
};

/** Ubicaciones de trabajo asignables a colaboradores (sucursales + remoto). */
export const WORK_LOCATIONS: Branch[] = [...BRANCHES, REMOTE_LOCATION];

export function getBranch(id: string | null | undefined): Branch | undefined {
  if (!id) return undefined;
  return BRANCHES.find((b) => b.id === id);
}

/** Busca entre todas las ubicaciones de trabajo (incluye "remoto"). */
export function getLocation(id: string | null | undefined): Branch | undefined {
  if (!id) return undefined;
  return WORK_LOCATIONS.find((l) => l.id === id);
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // radio terrestre en metros
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
