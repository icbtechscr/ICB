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

test('el catálogo limita sus adornos a la temporada y no anima cada producto', () => {
  const component = fs.readFileSync(new URL('../../src/components/seasonal/HalloweenCatalogAccent.tsx', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../../src/components/seasonal/HalloweenCatalogAccent.module.css', import.meta.url), 'utf8');
  assert.match(css, /display: none/);
  assert.match(css, /data-site-season="halloween"/);
  assert.match(css, /pointer-events: none/);
  assert.doesNotMatch(component + css, /https?:\/\/|<img|animation:|setInterval/);
});

test('murciélagos con vuelo pausable y sin calabazas en tarjetas', () => {
  const card = fs.readFileSync(new URL('../../src/components/ProductCard.tsx', import.meta.url), 'utf8');
  const decor = fs.readFileSync(new URL('../../src/components/seasonal/HalloweenDecor.tsx', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../../src/components/seasonal/HalloweenDecor.module.css', import.meta.url), 'utf8');
  assert.doesNotMatch(card, /HalloweenCatalogAccent|Pumpkin/);
  assert.match(decor, /data-halloween-flight/);
  assert.match(css, /\[data-paused="true"\] \.flight/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /translate3d/);
});
