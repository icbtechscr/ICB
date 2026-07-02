// Cliente de scraping de CPI (appcontadorcpi.com). SOLO servidor.
//
// Contrato descubierto (2026-07) inspeccionando la app "Facturacion FE":
//   - Login: POST "Page Main 4.php" con el formulario #formregistro:
//       Usuphp (usuario), Passphp (clave), SocaaID (id de empresa, "20" para ICB)
//     -> responde 200 y setea la cookie de sesion PHP.
//   - Lista de facturas COMPLETADAS: POST "ControlFacturacion - Consultas.php"
//       params: duser, d, str3, SocaaID, idiomasistema
//     -> devuelve el HTML de la tabla. Cada <tr> de datos trae (por celda):
//       tipo, [recibo], CLAVE(input 50 digitos), fecha, origen(+cod),
//       sucursal(+cod), vendedor(+cod), referencia, -, medio pago, [idcliente],
//       moneda, subtotal(¢/$), -, estado(ACEPTADA/RECHAZADA)
//
// NOTA: los valores exactos de `d` y `str3` (filtros/paginacion) se afinan en la
// primera corrida real (ver sync con ?debug=1, que guarda el HTML crudo).

const BASE = (process.env.CPI_BASE_URL || "https://www.appcontadorcpi.com/gm/").replace(
  /\/*$/,
  "/"
);
const USER = process.env.CPI_USER || "";
const PASS = process.env.CPI_PASS || "";
const ID = process.env.CPI_ID || "20";

export function cpiConfigured(): boolean {
  return Boolean(USER && PASS && ID);
}

export type CpiInvoice = {
  clave: string; // clave numerica (unica) — o "" si no se pudo leer
  tipo: string;
  factura: string;
  fechaIso: string | null; // ISO local CR
  origen: string;
  sucursal: string;
  vendedor: string;
  vendedorCod: string;
  cliente: string;
  moneda: "CRC" | "USD" | "EUR" | string;
  subtotal: number;
  estado: string;
};

// --- Cookies helpers ---
function readSetCookies(res: Response): string[] {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  const raw =
    typeof h.getSetCookie === "function"
      ? h.getSetCookie()
      : [res.headers.get("set-cookie") || ""].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).filter(Boolean);
}

function mergeCookies(...groups: string[][]): string {
  const jar = new Map<string, string>();
  for (const g of groups)
    for (const kv of g) {
      const i = kv.indexOf("=");
      if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

// --- Login: PHP crea la sesion en el primer GET; el POST del formulario la
// autentica. Devolvemos el header Cookie para reusar en las llamadas siguientes.
async function cpiLogin(): Promise<string> {
  if (!cpiConfigured()) {
    throw new Error("CPI sin configurar (CPI_USER/CPI_PASS/CPI_ID)");
  }
  // 1. Preflight GET: obtiene la cookie de sesion (PHPSESSID).
  const pre = await fetch(`${BASE}Enter.php`, { method: "GET" });
  const c1 = readSetCookies(pre);
  const jar1 = mergeCookies(c1);

  // 2. POST del formulario de login sobre esa misma sesion.
  const body = new URLSearchParams({ Usuphp: USER, Passphp: PASS, SocaaID: ID });
  const res = await fetch(`${BASE}Page Main 4.php`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(jar1 ? { cookie: jar1 } : {}),
    },
    body: body.toString(),
    redirect: "manual",
  });
  const c2 = readSetCookies(res);
  const cookie = mergeCookies(c1, c2);
  if (!cookie) {
    throw new Error(
      `CPI: login sin cookie de sesion (GET ${pre.status}, POST ${res.status})`
    );
  }
  return cookie;
}

// --- Descarga el HTML de la lista de facturas completadas ---
export async function cpiFetchCompletadasHtml(cookie?: string): Promise<string> {
  const jar = cookie || (await cpiLogin());
  const body = new URLSearchParams({
    duser: USER,
    d: "",
    str3: "",
    SocaaID: ID,
    idiomasistema: "Español",
  });
  const res = await fetch(`${BASE}ControlFacturacion - Consultas.php`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: jar,
    },
    body: body.toString(),
  });
  return res.text();
}

// --- Parser tolerante del HTML a filas de factura ---
const MONEDA_MAP: Record<string, string> = {
  Colones: "CRC",
  Dolares: "USD",
  Dólares: "USD",
  Euros: "EUR",
};

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmount(s: string): number {
  const n = s.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export function parseCompletadas(html: string): CpiInvoice[] {
  const out: CpiInvoice[] = [];
  // Cada factura es un <tr> ... </tr> que contiene fecha + moneda + estado.
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRe) || [];
  for (const row of rows) {
    if (!/(ACEPTADA|RECHAZADA|PROCESANDO|PENDIENTE)/i.test(row)) continue;
    if (!/(Colones|Dolares|Dólares|Euros)/.test(row)) continue;

    const fecha = row.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    const moneda = row.match(/\b(Colones|Dolares|Dólares|Euros)\b/);
    const monto = row.match(/[¢$₡]\s?[\d][\d.,]*/);
    const estado = row.match(/\b(ACEPTADA|RECHAZADA|PROCESANDO|PENDIENTE)\b/i);
    const clave = row.match(/\b(\d{40,60})\b/); // clave numerica de Hacienda

    // Celdas por texto, para ubicar tipo/origen/sucursal/vendedor.
    const cells = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map(stripTags);
    // input values (clave, codigos) por si el texto no basta
    const inputVals = (row.match(/value="([^"]*)"/gi) || []).map((m) =>
      m.replace(/^value="/i, "").replace(/"$/, "")
    );

    const tipo = cells[0] || "Factura";
    // vendedor: la celda cuyo valor de input es el codigo de vendedor suele ser
    // la 6a (index 6); tomamos el texto de esa celda si existe.
    const vendedor = cells[6] || "";
    const origen = cells[4] || "";
    const sucursal = cells[5] || "";
    const cliente = cells[7] || "";
    const vendedorCod = inputVals[5] || inputVals[4] || "";

    const monedaKey = moneda ? MONEDA_MAP[moneda[1]] || moneda[1] : "CRC";

    out.push({
      clave: clave ? clave[1] : "",
      tipo,
      factura: "",
      fechaIso: fecha ? `${fecha[1]}T${fecha[2]}` : null,
      origen,
      sucursal,
      vendedor,
      vendedorCod,
      cliente,
      moneda: monedaKey,
      subtotal: monto ? parseAmount(monto[0]) : 0,
      estado: estado ? estado[1].toUpperCase() : "",
    });
  }
  return out;
}

// Trae y parsea en un solo paso (para el sync).
export async function cpiGetCompletadas(): Promise<CpiInvoice[]> {
  const html = await cpiFetchCompletadasHtml();
  return parseCompletadas(html);
}

/** Normaliza un nombre para emparejar vendedor CPI <-> usuario (sin tildes). */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
