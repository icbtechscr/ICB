// Cliente de scraping de CPI (appcontadorcpi.com). SOLO servidor.
//
// Contrato (2026-07) inspeccionando "Facturacion FE":
//   - PHP crea la sesion (PHPSESSID) en el primer GET; el POST del formulario
//     de login la autentica.
//   - Login: POST "Page Main 4.php" con Usuphp, Passphp, SocaaID.
//   - Lista COMPLETADAS: POST "ControlFacturacion - Consultas.php"
//       params: duser, d, str3, SocaaID, idiomasistema  -> HTML de la tabla.
//   - Fila (15 celdas): tipo, [recibo], CLAVE(50 dig), fecha, origen(+cod),
//     sucursal(+cod), vendedor(+cod), referencia, -, medio pago, [idcliente],
//     moneda, subtotal(¢/$), -, estado(ACEPTADA/RECHAZADA).

const BASE = (process.env.CPI_BASE_URL || "https://www.appcontadorcpi.com/gm/").replace(
  /\/*$/,
  "/"
);
const USER = process.env.CPI_USER || "";
const PASS = process.env.CPI_PASS || "";
const ID = process.env.CPI_ID || "20";

// Headers de navegador: sin esto el servidor responde 403 a peticiones "bot".
const BROWSER_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "es-CR,es;q=0.9,en;q=0.8",
};

// Proxy opcional (IP de Costa Rica) para saltar el bloqueo de CPI a IPs de
// datacenter. Formato: http://usuario:clave@host:puerto  (o sin credenciales).
const PROXY = process.env.CPI_PROXY || "";

let dispatcherPromise: Promise<unknown> | null = null;
async function getDispatcher(): Promise<unknown> {
  if (!PROXY) return undefined;
  if (!dispatcherPromise) {
    dispatcherPromise = import("undici")
      .then((u) => new u.ProxyAgent(PROXY))
      .catch(() => undefined);
  }
  return dispatcherPromise;
}

// fetch que enruta por el proxy si esta configurado.
async function cpiFetch(url: string, init: RequestInit): Promise<Response> {
  const dispatcher = await getDispatcher();
  const opts = dispatcher ? { ...init, dispatcher } : init;
  return fetch(url, opts as RequestInit);
}

export function cpiConfigured(): boolean {
  return Boolean(USER && PASS && ID);
}

export type CpiInvoice = {
  clave: string;
  tipo: string;
  factura: string;
  fechaIso: string | null;
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

// --- Login: GET para la cookie de sesion, luego POST del formulario ---
async function cpiLogin(): Promise<string> {
  if (!cpiConfigured()) {
    throw new Error("CPI sin configurar (CPI_USER/CPI_PASS/CPI_ID)");
  }
  const pre = await cpiFetch(`${BASE}Enter.php`, {
    method: "GET",
    headers: { ...BROWSER_HEADERS, referer: BASE },
  });
  const c1 = readSetCookies(pre);
  const jar1 = mergeCookies(c1);

  const body = new URLSearchParams({ Usuphp: USER, Passphp: PASS, SocaaID: ID });
  const res = await cpiFetch(`${BASE}Page Main 4.php`, {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      "content-type": "application/x-www-form-urlencoded",
      origin: new URL(BASE).origin,
      referer: `${BASE}Enter.php`,
      ...(jar1 ? { cookie: jar1 } : {}),
    },
    body: body.toString(),
    redirect: "manual",
  });
  const c2 = readSetCookies(res);
  const cookie = mergeCookies(c1, c2);
  if (!cookie) {
    let hint = "";
    try {
      const t = (await pre.text()).replace(/\s+/g, " ").slice(0, 160);
      hint = ` — ${t}`;
    } catch {
      /* ignore */
    }
    throw new Error(
      `CPI: login sin cookie de sesion (GET ${pre.status}, POST ${res.status})${hint}`
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
  const res = await cpiFetch(`${BASE}ControlFacturacion - Consultas.php`, {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      "content-type": "application/x-www-form-urlencoded",
      "x-requested-with": "XMLHttpRequest",
      origin: new URL(BASE).origin,
      referer: `${BASE}Page Main 4.php`,
      cookie: jar,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = (await res.text()).replace(/\s+/g, " ").slice(0, 160);
    throw new Error(`CPI: consulta fallo (HTTP ${res.status}) — ${t}`);
  }
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
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRe) || [];
  for (const row of rows) {
    if (!/(ACEPTADA|RECHAZADA|PROCESANDO|PENDIENTE)/i.test(row)) continue;
    if (!/(Colones|Dolares|Dólares|Euros)/.test(row)) continue;

    const fecha = row.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    const moneda = row.match(/\b(Colones|Dolares|Dólares|Euros)\b/);
    const monto = row.match(/[¢$₡]\s?[\d][\d.,]*/);
    const estado = row.match(/\b(ACEPTADA|RECHAZADA|PROCESANDO|PENDIENTE)\b/i);
    const clave = row.match(/\b(\d{40,60})\b/);

    const cells = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map(stripTags);
    const inputVals = (row.match(/value="([^"]*)"/gi) || []).map((m) =>
      m.replace(/^value="/i, "").replace(/"$/, "")
    );

    const tipo = cells[0] || "Factura";
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
