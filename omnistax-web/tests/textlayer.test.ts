/* The pure parts of the text layer: where a string lands under the canvas's transform,
   the weight and size it is shown at, and the writes that bring the spans up to date. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPoint, scaleOf, angleOf, shownWeight, shownSize, isSerif, subDrop, topOf, styleOf, plan, inward, FLOOR, type Glyph } from '../src/lib/fig/textlayer';

const NCM = "'New Computer Modern Book',Georgia,'Times New Roman',serif";
const SANS = "'Source Sans 3','Segoe UI',Helvetica,Arial,sans-serif";
const glyph = (o: Partial<Glyph> = {}): Glyph => ({
  pieces: [{ s: 'v = 3.0 m/s', sub: false, lit: 0 }], x: 100, y: 50, size: 16, rot: 0, color: '#123456', alpha: 1,
  align: 'left', base: 0.3, weight: 400, italic: false, family: NCM, ...o,
});

test('a point lands where the canvas would put it, in CSS pixels', () => {
  const k = 2;   /* backing pixels per logical unit */
  const m = { a: k, b: 0, c: 0, d: k, e: 0, f: 0 };
  assert.deepEqual(mapPoint(m, 700, 240, 0.5), [700, 240]);          /* a 2800-px backing shown 1400 wide */
  const moved = { a: k, b: 0, c: 0, d: k, e: 40, f: 10 };             /* ctx.translate(20, 5) under the scale */
  assert.deepEqual(mapPoint(moved, 0, 0, 0.5), [20, 5]);
  const r = Math.PI / 2, turned = { a: k * Math.cos(r), b: k * Math.sin(r), c: -k * Math.sin(r), d: k * Math.cos(r), e: 0, f: 0 };
  const [x, y] = mapPoint(turned, 10, 0, 0.5);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(y - 10) < 1e-9);
  assert.ok(Math.abs(scaleOf(turned) - k) < 1e-9);
  assert.ok(Math.abs(angleOf(turned) - r) < 1e-9);
});

test('a serif shows its heavy labels at regular weight; the sans keeps them', () => {
  assert.equal(isSerif(NCM), true);
  assert.equal(isSerif(SANS), false);
  assert.equal(shownWeight(600, NCM), 400);
  assert.equal(shownWeight(700, NCM), 400);
  assert.equal(shownWeight(400, NCM), 400);
  assert.equal(shownWeight(600, SANS), 600);
});

test('no figure text is shown smaller than the floor, and larger text is left alone', () => {
  assert.equal(shownSize(7.5), FLOOR);
  assert.equal(shownSize(20), 20);
  assert.match(styleOf(glyph({ size: 8 }), 0).font, new RegExp(`\\b${FLOOR}px/1`));
});

test('a span past an edge of its layer moves in by the overflow', () => {
  assert.deepEqual(inward({ l: 10, t: 5, r: 90, b: 17 }, 100, 50), [0, 0]);
  assert.deepEqual(inward({ l: 650, t: 20, r: 760, b: 32 }, 738, 400), [-22, 0]);
  assert.deepEqual(inward({ l: -37, t: 393, r: 427, b: 405 }, 738, 451), [37, 0]);
  assert.deepEqual(inward({ l: 5, t: -4, r: 50, b: 8 }, 100, 50), [0, 4]);
  assert.deepEqual(inward({ l: 5, t: 45, r: 50, b: 57 }, 100, 50), [0, -7]);
  assert.deepEqual(inward({ l: -10, t: 0, r: 130, b: 12 }, 100, 50), [10, 0]);
});

test('a line box sits so its baseline is where the canvas put it', () => {
  /* a face 0.9 up and 0.3 down in a 1em box: the baseline is 0.8em below the box top */
  assert.ok(Math.abs(topOf(0, 0.9, 0.3) + 0.8) < 1e-9);
  assert.ok(Math.abs(topOf(0.25, 0.9, 0.3) + 0.55) < 1e-9);
  /* the alphabetic baseline: a subscript is lowered by the canvas's drop alone */
  assert.equal(subDrop(0), 0.22);
});

test('the style follows the alignment and the turn', () => {
  assert.match(styleOf(glyph({ align: 'center' }), -0.5).transform, /translate\(-50%,-0\.5em\)$/);
  assert.match(styleOf(glyph({ align: 'right', rot: -Math.PI / 2 }), 0).transform, /rotate\(-1\.57rad\) translate\(-100%,0em\)$/);
  assert.equal(styleOf(glyph({ alpha: 0.5 }), 0).opacity, '0.5');
  assert.equal(styleOf(glyph(), 0).opacity, '');
});

test('reconciling writes only what changed and drops the spans no longer drawn', () => {
  const a = styleOf(glyph(), 0), b = styleOf(glyph({ y: 60 }), 0), c = styleOf(glyph({ color: '#ff0000' }), 0);
  assert.deepEqual(plan([a, a], [a, a]), { writes: [], drop: 0 });
  const p = plan([a, a, a], [b, c]);
  assert.deepEqual(p.writes.map((w) => [w.i, w.changed]), [[0, ['transform']], [1, ['color']]]);
  assert.equal(p.drop, 1);
  const fresh = plan([], [a]);
  assert.equal(fresh.writes[0].changed.length, Object.keys(a).length);
  const lit = styleOf(glyph({ pieces: [{ s: 'v = ', sub: false, lit: 0 }, { s: '3.0', sub: false, lit: 0.4 }, { s: ' m/s', sub: false, lit: 0 }] }), 0);
  const unlit = styleOf(glyph({ pieces: [{ s: 'v = ', sub: false, lit: 0 }, { s: '3.0', sub: false, lit: 0 }, { s: ' m/s', sub: false, lit: 0 }] }), 0);
  assert.deepEqual(plan([unlit], [lit]).writes[0].changed, ['lit']);
});

test('a TeX piece is its own shape, so a run that turns to TeX rebuilds its spans', () => {
  const plainRun = styleOf(glyph({ pieces: [{ s: 'F = ma', sub: false, lit: 0 }] }), 0);
  const texRun = styleOf(glyph({ pieces: [{ s: '\\kF = \\km\\ka', sub: false, lit: 0, html: '<span class="katex"><span class="kv-force">F</span></span>' }] }), 0);
  assert.equal(texRun.shape, '$');
  assert.ok(plan([plainRun], [texRun]).writes[0].changed.includes('shape'));
});
