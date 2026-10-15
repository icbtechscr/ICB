import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { recoveryRange, planRecovery, insertMissing } from '../scripts/recover-cpi-sales.mjs';
const range = { from: '2026-10-02', to: '2026-10-15' };
const row = (factura, vendedor = 'Known vendor') => ({ tipo: 'Factura', factura, fecha: '2026-10-02T12:00:00', cpi_key: `Factura|${factura}|2026-10-02`, vendedor, subtotal: 1000 });
const mappings = [{ cpi_vendor: 'Known vendor', user_id: 'existing-user' }, { cpi_vendor: 'Ignored vendor', user_id: null }];
test('recovery validates calendar dates and bounded ranges', () => {
  assert.deepEqual(recoveryRange(range.from, range.to), range);
  for (const [from, to] of [['2026-02-30', '2026-03-01'], ['bad', range.to], [range.to, range.from], ['2026-01-01', range.to]]) assert.throws(() => recoveryRange(from, to));
});
test('recovery only inserts missing keys using existing exact mappings', () => {
  const source = [row('1'), row('2'), row('3', 'New vendor'), row('4', 'Ignored vendor')];
  const before = JSON.stringify({ source, mappings });
  const plan = planRecovery(source, mappings, new Set([source[0].cpi_key]), range, '2026-10-15T17:00:00Z');
  assert.equal(plan.summary.toInsert, 3); assert.equal(plan.summary.alreadyPresent, 1);
  assert.equal(plan.summary.linkedToExistingVendor, 1);
  assert.deepEqual(plan.missing.map(value => value.user_id), ['existing-user', null, null]);
  assert.equal(JSON.stringify({ source, mappings }), before);
});
test('recovery rejects duplicate keys, out-of-range and malformed source rows', () => {
  for (const rows of [[], [row('1'), row('1')], [{ ...row('1'), fecha: '2026-10-01T12:00:00' }], [{ ...row('1'), cpi_key: 'wrong' }], [{ ...row('1'), subtotal: NaN }]]) assert.throws(() => planRecovery(rows, mappings, new Set(), range));
});
test('apply requires reviewed missing count and uses insert without upsert/delete/update', async () => {
  const plan = planRecovery([row('1')], mappings, new Set(), range);
  const calls = [];
  const sb = { from: table => { assert.equal(table, 'cpi_sales'); return { insert: async rows => { calls.push(rows); return { error: null }; } }; } };
  await assert.rejects(insertMissing(sb, plan, 2)); assert.equal(calls.length, 0);
  await insertMissing(sb, plan, 1); assert.equal(calls.length, 1);
  await assert.rejects(insertMissing({ from: () => ({ insert: async () => ({ error: { code: '23505' } }) }) }, plan, 1));
  const source = fs.readFileSync(new URL('../scripts/recover-cpi-sales.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.(?:delete|update|upsert)\s*\(/);
  assert.match(source, /CPI_ID !== '20'/);
});
