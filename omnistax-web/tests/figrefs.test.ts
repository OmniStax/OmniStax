/* Which referents each figure draws, read off figures.js: the shapes the books' scripts take, each in a few lines. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { figureLiterals, figureRefs } from '../src/lib/content/figrefs';

const wrap = (body: string): string =>
  `window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};\nwindow.OMNISTAX_FIGURES['2.4'] = function (root, F) {\nconst sim = (id, H) => F.sim(root, id, H);\n${body}\n};\n`;
const read = (js: string, figures: readonly string[], refs: readonly string[]): Record<string, readonly string[]> =>
  Object.fromEntries([...figureRefs(js, figures, refs)].map(([f, ids]) => [f, [...ids].sort()]));

test('each IIFE draws what it names, and a function declared before one does not swallow it', () => {
  const js = wrap(`function topCar(ctx, c) { ctx.fillStyle = c; }
(function () { const d = sim('sim-a', 600); const k = 1 / 3; topCar(ctx, F.ref('car')); /* F.ref('ghost') */ })();
(function () { const d = sim('sim-b', 600); topCar(ctx, F.ref('turning-car')); const re = /'car'/g; })();`);
  assert.deepEqual(read(js, ['sim-a', 'sim-b'], ['car', 'turning-car', 'ghost']), { 'sim-a': ['car'], 'sim-b': ['turning-car'] });
});

test('a factory that names two referents gives each figure the one its call names', () => {
  const js = wrap(`function accelSim(o) {
  const d = sim(o.id, 650);
  if (o.sprite === 'horse') horse(F.ref('horse')); else train(F.ref('train'));
}
accelSim({ id: 'sim-racehorse', sprite: 'horse' });
const TRAIN = { sprite: 'train', unit: 'km/h' };
accelSim({ ...TRAIN, id: 'sim-subway-speeding-up' });`);
  assert.deepEqual(read(js, ['sim-racehorse', 'sim-subway-speeding-up'], ['horse', 'train']), { 'sim-racehorse': ['horse'], 'sim-subway-speeding-up': ['train'] });
});

test('a helper that always draws several referents gives them all to every figure that calls it', () => {
  const js = wrap(`function apparatus(ctx) { line(F.ref('rails')); line(F.ref('rod')); }
(function () { const d = sim('sim-rod-rails', 600); apparatus(ctx); text('R', F.ref('resistor')); })();`);
  assert.deepEqual(read(js, ['sim-rod-rails'], ['rails', 'rod', 'resistor']), { 'sim-rod-rails': ['rails', 'resistor', 'rod'] });
});

test('an id read from a table, a choice between two strings, and an id joined from a string', () => {
  const js = wrap(`const CARS = [['(a)', 'car-a'], ['(b)', 'car-b']];
(function () { const d = sim('sim-cars', 600); CARS.forEach(([lab, id]) => F.ref(id)); })();
(function () { const d = sim('sim-pick', 600); F.ref(i ? 'changed' : 'baseline'); })();
(function () { const d = sim('sim-paths', 600); [1, 2].forEach((k) => F.ref('path-' + k)); F.ref(q.block + '-block'); \`\${F.ref('tex')}\`; })();`);
  assert.deepEqual(read(js, ['sim-cars', 'sim-pick', 'sim-paths'], ['car-a', 'car-b', 'changed', 'baseline', 'path-1', 'path-2', 's-block', 'tex', 'other']), {
    'sim-cars': ['car-a', 'car-b'], 'sim-pick': ['baseline', 'changed'], 'sim-paths': ['path-1', 'path-2', 's-block', 'tex'],
  });
});

test('a figure that draws no referent is left out', () => {
  assert.deepEqual(read(wrap(`(function () { const d = sim('sim-a', 600); })();`), ['sim-a'], ['car']), {});
});

test('an F.el read only to build a joined signature is not drawing', () => {
  const js = wrap([
    "const palSig = () => [PAL.ink, F.el('S'), ...['Na'].map((e) => F.el(e)), F.el('C')].join('|');",
    "(() => { const s = sim('sim-a', 400); s.draw = () => { if (palSig() !== sig) return; const key = [F.el('Cl')].join(); fill(F.el('O')); }; })();",
  ].join('\n'));
  const got = figureLiterals(js, ['sim-a'], 'el');
  assert.deepEqual([...(got.byFigure.get('sim-a') ?? [])], ['O']);
  assert.deepEqual([...got.loose], []);
});

test('an F.el inside a top-level helper belongs to the figures that call it, not to one that only names a key alike', () => {
  const js = wrap([
    "function water(ctx) { F.el('O'); F.el('H'); }",
    "function particle(ctx, sub) { if (sub.form === 'water') water(ctx); }",
    "(() => { const d = sim('sim-phases', 400); d.draw = () => particle(ctx, s); })();",
    "(() => { const d = sim('sim-heating-curve', 400); const state = () => ({ ice: 1, water: 0 }); d.draw = () => fill(F.ref('sample')); })();",
  ].join('\n'));
  const got = figureLiterals(js, ['sim-phases', 'sim-heating-curve'], 'el');
  assert.deepEqual([...(got.byFigure.get('sim-phases') ?? [])].sort(), ['H', 'O']);
  assert.equal(got.byFigure.get('sim-heating-curve'), undefined);
  assert.deepEqual([...got.loose], []);
});
