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
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const desde = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const hasta = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const base = { duser: USER, SocaaID: ID, idiomasistema: "Español" };
  const candidatos = [
    { name: "control",      ep: "ControlFacturacion.php", params: { ...base } },
    { name: "control_cant", ep: "ControlFacturacion.php", params: { ...base, cantidadderegistrosamostrar: "5000" } },
    { name: "control_fecha", ep: "ControlFacturacion.php", params: {
        ...base, cantidadderegistrosamostrar: "5000",
        activahastafecha: "true",
        searchporfechafacturacion: desde,
        searchhastaporfechafacturacion: hasta,
      } },
    { name: "consultas",    ep: "ControlFacturacion - Consultas.php", params: {
        ...base, d: "", str3: "",
        cantidadderegistrosamostrar: "5000",
        activahastafecha: "true",
        searchporfechafacturacion: desde,
        searchhastaporfechafacturacion: hasta,
      } },
  ];
  const rowsRe = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/g;
  let best = null;
  for (const c of candidatos) {
    const body = new URLSearchParams(c.params).toString();
    let res;
    try {
      res = await request(`${BASE}${c.ep}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "content-length": Buffer.byteLength(body), "x-requested-with": "XMLHttpRequest", origin: new URL(BASE).origin, referer: `${BASE}Page Main 4.php`, ...(cookie ? { cookie } : {}) },
        body,
      });
    } catch (e) { console.log(`  ${c.name}: error ${e.message}`); continue; }
    const n = (res.body.match(rowsRe) || []).length;
    if (DEBUG) writeFileSync(`cpi-${c.name}.html`, res.body, "utf8");
    console.log(`  candidato ${c.name} (${c.ep}) -> ${res.status}, ${res.body.length} chars, ~${n} filas con fecha`);
    if (!best || n > best.n) best = { html: res.body, n, name: c.name };
  }
  if (!best || best.n < 2) throw new Error("Ningun endpoint devolvio la lista de facturas. Revisá los cpi-*.html.");
  console.log(`  => usando "${best.name}" (${best.n} filas)`);
  return best.html;
}
const MONEDA = { Colones: "CRC", Dolares: "USD", "Dólares": "USD", Euros: "EUR" };
const strip = (s) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const amount = (s) => { const n = Number(s.replace(/[^\d.,-]/g, "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; };
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function parse(html) {
  const out = [];
  const seen = new Set();
  const TIPOS = /(Factura exportacion|Nota Debito|Nota Credito|Tiquete|Apartado|Factura)/i;
  const decodeEnt = (x) => (x || "").replace(/&#162;/g, "").replace(/&#36;/g, "").replace(/&amp;/g, "&");
  const afterInput = (row, name) => {
    const m = row.match(new RegExp(name + '"[^>]*>\\s*([^<]+)', "i"));
    return m ? m[1].replace(/\s+/g, " ").trim() : "";
  };
  const chunks = html.split(/<tr[\s>]/i).slice(1);
  for (const raw of chunks) {
    const row = raw.split(/<\/tr>/i)[0];
    if (!/(ACEPTADA|RECHAZADA|PROCESAN|PENDIENTE)/i.test(row)) continue;
    const fecha = row.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (!fecha) continue;

    const byName = {}; const values = [];
    for (const inp of row.match(/<input[^>]*>/gi) || []) {
      const nm = (inp.match(/name="([^"]*)"/i) || [])[1];
      const vl = (inp.match(/value="([^"]*)"/i) || [])[1];
      if (vl != null) values.push(vl);
      if (nm && byName[nm] === undefined) byName[nm] = vl;
    }

    // El monto puede venir como texto (completadas) o en un input (prefacturas).
    let mM = row.match(/(&#162;|&#36;|₡|¢)\s?([\d][\d.,]*)/);
    if (!mM) { const d = row.match(/\$\s?([\d][\d.,]*)/); if (d) mM = ["$", "$", d[1]]; }
    const sym = mM ? mM[1] : "";
    const montoNum = mM ? mM[2] : "0";
    const monedaVal = values.find((v) => /^(Colones|Dolares|Dólares|Euros)$/i.test(v || "")) || "";
    const moneda = /(&#36;|\$)/.test(sym) || /Dolar|Dólar/i.test(monedaVal) ? "USD"
      : /Euro/i.test(monedaVal) ? "EUR" : "CRC";
    const estado = /ACEPTADA/i.test(row) ? "ACEPTADA"
      : /RECHAZADA/i.test(row) ? "RECHAZADA"
      : /PROCESAN/i.test(row) ? "PROCESANDO" : "PENDIENTE";
    const tipoM = row.match(TIPOS);
    const factura = byName["numeroclickctrlfacturacion"] || "";
    const clave = byName["clavenumelineafacturacion"] || (row.match(/\b(\d{40,60})\b/) || [])[1] || "";
    const vendedor = afterInput(row, "codidvendedorfacturacion");
    const origen = afterInput(row, "sucursalsearchfacturacion");
    const sucursal = afterInput(row, "puntoventasearchfacturacion");
    let cliente = "";
    for (const inp of row.match(/<input[^>]*numeroclickctrlconsgprove[^>]*>/gi) || []) {
      const vl = (inp.match(/value="([^"]*)"/i) || [])[1] || "";
      if (vl && !/^\d+$/.test(vl)) { cliente = vl; break; }
    }

    const key = clave || [factura, fecha[0]].join("|");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      cpi_key: key, tipo: tipoM ? tipoM[1] : "Factura", factura,
      fecha: `${fecha[1]}T${fecha[2]}`,
      origen, sucursal, vendedor, cliente, moneda,
      subtotal: amount(montoNum), estado,
    });
  }
  return out;
}

// Guarda filas en Supabase con el mapeo vendedor->usuario.
async function saveRows(rows) {
  if (rows.length === 0) { console.log("Sin filas para guardar."); return; }
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

// Ruta del archivo a importar si se paso --import (o --import=RUTA).
function importPath() {
  const i = process.argv.findIndex((a) => a === "--import" || a.startsWith("--import="));
  if (i < 0) return null;
  const a = process.argv[i];
  if (a.includes("=")) return a.split("=").slice(1).join("=");
  return process.argv[i + 1] || null;
}

async function main() {
  const imp = importPath();
  if (imp) {
    console.log("Importando desde:", imp);
    const rows = JSON.parse(readFileSync(imp, "utf8"));
    console.log(`Filas en el archivo: ${rows.length}`);
    await saveRows(rows);
    return;
  }
  console.log("Ingresando a CPI\u2026");
  const cookie = await login();
  console.log("Sesion OK. Descargando facturas\u2026");
  const html = await fetchCompletadas(cookie);
  const rows = parse(html);
  console.log(`Facturas leidas: ${rows.length}`);
  if (rows.length === 0) { console.log("0 filas. Revisa cpi-lista.html (corre con --debug)."); return; }
  await saveRows(rows);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exitCode = 1; });
