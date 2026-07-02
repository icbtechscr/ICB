// Sincroniza las ventas de CPI hacia Supabase, corriendo en TU computadora
// (usa tu IP de Costa Rica, que CPI sí acepta). Gratis, sin proxy.
// Usa el modulo https nativo (cookies confiables, sin el bug de undici en Windows).
//
//   node scripts/sync-cpi.mjs           -> sincroniza
//   node scripts/sync-cpi.mjs --debug   -> guarda cpi-get/post/lista.html
import { readFileSync, writeFileSync } from "node:fs";
import https from "node:https";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { console.warn("No se encontró .env.local"); }
}
loadEnv();

const DEBUG = process.argv.includes("--debug");
const BASE = (process.env.CPI_BASE_URL || "https://www.appcontadorcpi.com/gm/").replace(/\/*$/, "/");
const USER = process.env.CPI_USER || "";
const PASS = process.env.CPI_PASS || "";
const ID = process.env.CPI_ID || "20";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SECRET_KEY || "";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// request() con https nativo. Devuelve { status, headers, body }.
function request(urlStr, { method = "GET", headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search, // URL ya codifica los espacios como %20
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "es-CR,es;q=0.9,en;q=0.8",
        "accept-encoding": "identity",
        ...headers,
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function jarFrom(setCookie) {
  const jar = new Map();
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const c of list) { const kv = c.split(";")[0]; const i = kv.indexOf("="); if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1)); }
  return jar;
}
const jarStr = (jar) => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function login() {
  if (!USER || !PASS || !ID) throw new Error("Faltan CPI_USER/CPI_PASS/CPI_ID en .env.local");
  const jar = new Map();

  const pre = await request(`${BASE}Enter.php`, { headers: { referer: BASE } });
  for (const [k, v] of jarFrom(pre.headers["set-cookie"])) jar.set(k, v);
  if (DEBUG) { console.log("GET Enter.php ->", pre.status, "| cookies:", [...jar.keys()].join(",") || "(ninguna)"); writeFileSync("cpi-get.html", pre.body, "utf8"); }

  const body = new URLSearchParams({ Usuphp: USER, Passphp: PASS, SocaaID: ID }).toString();
  const res = await request(`${BASE}Page Main 4.php`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "content-length": Buffer.byteLength(body),
      origin: new URL(BASE).origin,
      referer: `${BASE}Enter.php`,
      ...(jar.size ? { cookie: jarStr(jar) } : {}),
    },
    body,
  });
  for (const [k, v] of jarFrom(res.headers["set-cookie"])) jar.set(k, v);
  if (DEBUG) { console.log("POST Page Main 4.php ->", res.status, "| cookies:", [...jar.keys()].join(",") || "(ninguna)"); writeFileSync("cpi-post.html", res.body, "utf8"); }

  if (/AVISO DE BLOQUEO/i.test(res.body)) throw new Error("CPI bloqueó la petición (AVISO DE BLOQUEO). Tu IP no fue aceptada.");
  if (/contrase.a o usuario incorrect|usuario o contrase.a incorrect/i.test(res.body)) throw new Error("Usuario o contraseña incorrectos según CPI.");
  // CPI no usa cookie de sesion: autentica por parametros (duser + SocaaID) en
  // cada llamada. Si el POST devolvio la app ("Aplicaciones"), el login sirvio.
  if (!/Aplicaciones|Facturacion|Cerrar sesion|EXIT/i.test(res.body)) {
    throw new Error(`El login no devolvio la app (GET ${pre.status}, POST ${res.status}). Revisá cpi-post.html.`);
  }
  return jarStr(jar); // puede ir vacio
}

async function fetchCompletadas(cookie) {
  const body = new URLSearchParams({ duser: USER, d: "", str3: "", SocaaID: ID, idiomasistema: "Español" }).toString();
  const res = await request(`${BASE}ControlFacturacion - Consultas.php`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "content-length": Buffer.byteLength(body),
      "x-requested-with": "XMLHttpRequest",
      origin: new URL(BASE).origin,
      referer: `${BASE}Page Main 4.php`,
      ...(cookie ? { cookie } : {}),
    },
    body,
  });
  if (DEBUG) { console.log("POST Consultas.php ->", res.status, `(${res.body.length} chars)`); writeFileSync("cpi-lista.html", res.body, "utf8"); }
  if (res.status >= 400) throw new Error(`Consulta falló (HTTP ${res.status})`);
  return res.body;
}

const MONEDA = { Colones: "CRC", Dolares: "USD", "Dólares": "USD", Euros: "EUR" };
const strip = (s) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const amount = (s) => { const n = Number(s.replace(/[^\d.,-]/g, "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; };
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function parse(html) {
  const out = [];
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    if (!/(ACEPTADA|RECHAZADA|PROCESANDO|PENDIENTE)/i.test(row)) continue;
    if (!/(Colones|Dolares|Dólares|Euros)/.test(row)) continue;
    const fecha = row.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    const moneda = row.match(/\b(Colones|Dolares|Dólares|Euros)\b/);
    const monto = row.match(/[¢$₡]\s?[\d][\d.,]*/);
    const estado = row.match(/\b(ACEPTADA|RECHAZADA|PROCESANDO|PENDIENTE)\b/i);
    const clave = row.match(/\b(\d{40,60})\b/);
    const cells = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map(strip);
    const key = clave ? clave[1] : [cells[0], cells[6], fecha ? fecha[0] : "", monto ? monto[0] : ""].join("|");
    out.push({
      cpi_key: key, tipo: cells[0] || "Factura", factura: "",
      fecha: fecha ? `${fecha[1]}T${fecha[2]}` : null,
      origen: cells[4] || "", sucursal: cells[5] || "", vendedor: cells[6] || "", cliente: cells[7] || "",
      moneda: moneda ? (MONEDA[moneda[1]] || moneda[1]) : "CRC",
      subtotal: monto ? amount(monto[0]) : 0, estado: estado ? estado[1].toUpperCase() : "",
    });
  }
  return out;
}

async function main() {
  console.log("Ingresando a CPI…");
  const cookie = await login();
  console.log("Sesión OK. Descargando facturas…");
  const html = await fetchCompletadas(cookie);
  const rows = parse(html);
  console.log(`Facturas leídas: ${rows.length}`);
  if (rows.length === 0) { console.log("0 filas. Revisá cpi-lista.html (corré con --debug)."); return; }
  if (!SB_URL || !SB_KEY) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY en .env.local");
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  const { data: mapRows } = await sb.from("cpi_vendor_map").select("cpi_vendor, user_id");
  const map = new Map(); const pending = [];
  for (const r of mapRows || []) r.user_id ? map.set(r.cpi_vendor, r.user_id) : pending.push(r.cpi_vendor);
  if (pending.length) {
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byName = new Map();
    for (const u of list?.users || []) { const f = u.user_metadata?.full_name || ""; if (f) byName.set(norm(f), u.id); }
    for (const v of pending) { const uid = byName.get(norm(v)); if (uid) { map.set(v, uid); await sb.from("cpi_vendor_map").update({ user_id: uid }).eq("cpi_vendor", v); } }
  }
  for (const r of rows) r.user_id = map.get(r.vendedor) || null;

  const { error } = await sb.from("cpi_sales").upsert(rows, { onConflict: "cpi_key" });
  if (error) throw new Error("Supabase: " + error.message);
  const matched = rows.filter((r) => r.user_id).length;
  console.log(`Listo. ${rows.length} facturas guardadas (${matched} ligadas a un usuario).`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exitCode = 1; });
