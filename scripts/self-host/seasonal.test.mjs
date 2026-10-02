import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const env = {};
const exports = {};
const source = fs.readFileSync(new URL('../../src/lib/seasonal.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, process: { env }, Intl, Date });

test('temporadas cambian a medianoche de Costa Rica', () => {
  assert.equal(exports.getSiteSeason(new Date('2026-10-01T05:59:59Z')), 'patriotic-month');
  assert.equal(exports.getSiteSeason(new Date('2026-10-01T06:00:00Z')), 'halloween');
  assert.equal(exports.getSiteSeason(new Date('2026-11-01T05:59:59Z')), 'halloween');
  assert.equal(exports.getSiteSeason(new Date('2026-11-01T06:00:00Z')), null);
});
test('se repite en octubre y permite apagar o previsualizar sin combinar temporadas', () => {
  assert.equal(exports.getSiteSeason(new Date('2027-10-15T12:00:00Z')), 'halloween');
  for (const [override, expected] of [['off', null], ['patria', 'patriotic-month'], ['halloween', 'halloween'], ['terror', 'halloween']]) {
    env.SEASON_OVERRIDE = override;
    assert.equal(exports.getSiteSeason(new Date('2026-10-02T12:00:00Z')), expected);
  }
  delete env.SEASON_OVERRIDE;
});
test('decoración ligera, pausable y compatible con movimiento reducido', () => {
  const css = fs.readFileSync(new URL('../../src/components/seasonal/HalloweenDecor.module.css', import.meta.url), 'utf8');
  const component = fs.readFileSync(new URL('../../src/components/seasonal/HalloweenDecor.tsx', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation-play-state: paused/);
  assert.match(css, /pointer-events: none/);
  assert.match(component, /Mes de terror/);
  assert.doesNotMatch(component, /https?:\/\/|<img|<canvas|setInterval/);
});
