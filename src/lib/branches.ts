// Sucursales de ICB Technologies + CEDI.
// Fuente de verdad compartida por: página /sucursales, footer y el sistema
// de marcaje de horario (control de colaboradores).
//
// Las coordenadas se usan para verificar dónde marcó cada colaborador.
// La mayoría se extrajeron de los enlaces de Waze (parámetro `ll=`).
// NOTA: las coordenadas de Alajuela son aproximadas — verificarlas en sitio.

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
};

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
    phone: "+506 4001 6421",
    lat: 10.0098,
    lng: -84.201,
    gmaps: "https://maps.app.goo.gl/CrJDb1hYDFCgYieg8",
    waze: "https://ul.waze.com/ul?venue_id=180748388.1807418345.25237283&overview=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
  },
  {
    id: "heredia",
    city: "Heredia",
    name: "ICB Technologies Heredia",
    address:
      "Corazón de Jesús, Heredia. Costado Sur de la Biblioteca pública de Heredia. Frente al INA.",
    phone: "+506 4001 6421",
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
    phone: "+506 4001 6421",
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
    phone: "+506 4001 6421",
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
    phone: "+506 4001 6421",
    lat: 9.9812842,
    lng: -84.1513852,
    gmaps: "https://maps.app.goo.gl/jatydzHVitGKQ4Av6",
    waze: "https://ul.waze.com/ul?place=ChIJm49cynz972gRUN6acuCstkI&ll=9.98128420%2C-84.15138520&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location",
    cedi: true,
  },
];

/** Radio (metros) dentro del cual un marcaje se considera "en sede". */
export const BRANCH_RADIUS_M = 200;

export function getBranch(id: string | null | undefined): Branch | undefined {
  if (!id) return undefined;
  return BRANCHES.find((b) => b.id === id);
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
