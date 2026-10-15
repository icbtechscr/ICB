// Recuperación ICB insert-only. Nunca borra/actualiza ventas ni modifica mapeos.
// Por defecto solo consulta. --apply exige --expected-missing=N tras revisar dry-run.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { login, fetchReporte, parse } from './sync-cpi.mjs';
import { checkSyncTarget } from './self-host/run-cpi.mjs';

export function recoveryRange(from, to) {
  for (const day of [from, to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) throw new Error('Fecha inválida');
  }
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (days < 1 || days > 62) throw new Error('Rango inválido (1..62 días)');
  return { from, to };
}

export function planRecovery(rows, mappings, existingKeys, range, syncedAt = new Date().toISOString()) {
  if (!rows.length || rows.length > 10000) throw new Error('Cantidad de facturas fuera de límites');
  const keys = new Set();
  const map = new Map(mappings.map(row => [row.cpi_vendor, row.user_id || null]));
  const missing = [];
  for (const row of rows) {
    const day = row.fecha?.slice(0, 10);
    if (!day || day < range.from || day > range.to || row.cpi_key !== [row.tipo, row.factura, day].join('|') || keys.has(row.cpi_key) || !Number.isFinite(row.subtotal)) throw new Error('Reporte inconsistente o fuera del rango autorizado');
    keys.add(row.cpi_key);
    if (!existingKeys.has(row.cpi_key)) missing.push({ ...row, user_id: map.get(row.vendedor) || null, synced_at: syncedAt });
  }
  return { missing, summary: { ...range, source: rows.length, alreadyPresent: rows.length - missing.length,
    toInsert: missing.length, linkedToExistingVendor: missing.filter(row => row.user_id).length,
    withoutUser: missing.filter(row => !row.user_id).length } };
}

export async function insertMissing(sb, plan, expected) {
  if (!Number.isInteger(expected) || expected < 0 || plan.missing.length !== expected) throw new Error('La cantidad pendiente no coincide con la revisión previa');
  if (!plan.missing.length) return;
  // Una sola inserción atómica. Una colisión concurrente falla sin sobrescribir nada.
  const { error } = await sb.from('cpi_sales').insert(plan.missing);
  if (error) throw new Error('No se completó la inserción; no se sobrescribieron ventas existentes');
}

async function main() {
  const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const range = recoveryRange(arg('from'), arg('to'));
  checkSyncTarget(process.env);
  if (process.env.CPI_ID !== '20') throw new Error('Esta recuperación es exclusiva de ICB, empresa 20');
  const cookie = await login();
  const rows = parse(await fetchReporte(cookie, range));
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data: mappings, error } = await sb.from('cpi_vendor_map').select('cpi_vendor,user_id');
  if (error || !mappings) throw new Error('No se pudo leer el mapeo; recuperación cancelada');
  const existingKeys = new Set();
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error: readError } = await sb.from('cpi_sales').select('cpi_key').in('cpi_key', rows.slice(i, i + 200).map(row => row.cpi_key));
    if (readError || !data) throw new Error('No se pudieron comprobar claves existentes');
    for (const row of data) existingKeys.add(row.cpi_key);
  }
  const plan = planRecovery(rows, mappings, existingKeys, range);
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'insert-only' : 'dry-run', ...plan.summary }));
  if (!process.argv.includes('--apply')) return;
  if (!/^\d+$/.test(arg('expected-missing') || '')) throw new Error('Falta --expected-missing revisado');
  await insertMissing(sb, plan, Number(arg('expected-missing')));
  console.log(JSON.stringify({ inserted: plan.missing.length, existingSalesModified: 0, salesDeleted: 0, mappingsModified: 0 }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Recuperación ICB cancelada; no se muestran datos privados'); process.exitCode = 1; });
}
