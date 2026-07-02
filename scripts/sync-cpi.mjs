// Sincroniza las ventas de CPI hacia Supabase, corriendo en TU computadora
// (usa tu IP de Costa Rica, que CPI sí acepta). Gratis, sin proxy.
//
// Uso:
//   1. En .env.local (raíz del proyecto) agregá:
//        CPI_USER=tu_usuario
//        CPI_PASS=tu_clave
//        CPI_ID=20
//      (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY ya deberían estar ahí)
//   2. Corré:  node scripts/sync-cpi.mjs
//      Para ver el HTML crudo (afinar el parser): node scripts/sync-cpi.mjs --debug
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- cargar .env.local ---
function loadEnv() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    console.warn("No se encontró .env.local (usaré variables del sistema).");
  }
}
loadEnv();

const DEBUG = process.argv.includes("--debug");
const BASE = (process.env.CPI_BASE_URL || "https://www.appcontadorcpi.com/gm/").replace(/\/*$/, "/");
const USER = process.env.CPI_USER || "";
const PASS = process.env.CPI_PASS || "";
const ID = process.env.CPI_ID || "20";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SECRET_KEY || "";

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "es-CR,es;q=0.9,en;q=0.8",
};

function readSetCookies(res) {
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie") || ""].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).filter(Boolean);
}
function mergeCookies(...groups) {
  const jar = new Map();
  for (const g of groups) for (const kv of g) {
    const i = kv.indexOf("=");
    if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1));
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function login() {
  if (!USER || !PASS || !ID) throw new Error("Faltan CPI_USER/CPI_PASS/CPI_ID en .env.local");
  const pre = await fetch(`${BASE}Enter.php`, { headers: { ...HEADERS, referer: BASE } });
  const c1 = readSetCookies(pre);
  const body = new URLSearchParams({ Usuphp: USER, Passphp: PASS, SocaaID: ID });
  const res = await fetch(`${BASE}Page Main 4.php`, {
    method: "POST",
    headers: {
      ...HEADERS,
      "content-type": "application/x-www-form-urlencoded",
      origin: new URL(BASE).origin,
      referer: `${BASE}Enter.php`,
      ...(c1.length ? { cookie: mergeCookies(c1) } : {}),
    },
    body: body.toString(),
    redirect: "manual",
  });
  const cookie = mergeCookies(c1, readSetCookies(res));
  if (!cookie) throw new Error(`Login sin cookie (GET ${pre.status}, POST ${res.status})`);
  return cookie;
}

async function fetchCompletadas(cookie) {
  const body = new URLSearchParams({ duser: USER, d: "", str3: "", SocaaID: ID, idiomasistema: "Español" });
  const res = await fetch(`${BASE}ControlFacturacion - Consultas.php`, {
    method: "POST",
    headers: {
      ...HEADERS,
      "content-type": "application/x-www-form-urlencoded",
      "x-requested-with": "XMLHttpRequest",
      origin: new URL(BASE).origin,
      referer: `${BASE}Page Main 4.php`,
      cookie,
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Consulta falló (HTTP ${res.status})`);
  return res.text();
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
      cpi_key: key,
      tipo: cells[0] || "Factura",
      factura: "",
      fecha: fecha ? `${fecha[1]}T${fecha[2]}` : null,
      origen: cells[4] || "",
      sucursal: cells[5] || "",
      vendedor: cells[6] || "",
      cliente: cells[7] || "",
      moneda: moneda ? (MONEDA[moneda[1]] || moneda[1]) : "CRC",
      subtotal: monto ? amount(monto[0]) : 0,
      estado: estado ? estado[1].toUpperCase() : "",
    });
  }
  return out;
}

async function main() {
  console.log("Ingresando a CPI…");
  const cookie = await login();
  console.log("Sesión OK. Descargando facturas…");
  const html = await fetchCompletadas(cookie);
  if (DEBUG) {
    writeFileSync("cpi-debug.html", html, "utf8");
    console.log(`HTML guardado en cpi-debug.html (${html.length} chars)`);
  }
  const rows = parse(html);
  console.log(`Facturas leídas: ${rows.length}`);
  if (rows.length === 0) {
    console.log("No se encontraron filas. Corré con --debug y revisá cpi-debug.html.");
    return;
  }
  if (!SB_URL || !SB_KEY) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY en .env.local");
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  // Resolver vendedor -> usuario (mapa + auto-match por nombre).
  const { data: mapRows } = await sb.from("cpi_vendor_map").select("cpi_vendor, user_id");
  const map = new Map();
  const pending = [];
  for (const r of mapRows || []) r.user_id ? map.set(r.cpi_vendor, r.user_id) : pending.push(r.cpi_vendor);
  if (pending.length) {
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byName = new Map();
    for (const u of list?.users || []) {
      const full = u.user_metadata?.full_name || "";
      if (full) byName.set(norm(full), u.id);
    }
    for (const v of pending) {
      const uid = byName.get(norm(v));
      if (uid) { map.set(v, uid); await sb.from("cpi_vendor_map").update({ user_id: uid }).eq("cpi_vendor", v); }
    }
  }
  for (const r of rows) r.user_id = map.get(r.vendedor) || null;

  const { error } = await sb.from("cpi_sales").upsert(rows, { onConflict: "cpi_key" });
  if (error) throw new Error("Supabase: " + error.message);
  const matched = rows.filter((r) => r.user_id).length;
  console.log(`Listo. ${rows.length} facturas guardadas (${matched} ligadas a un usuario).`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
