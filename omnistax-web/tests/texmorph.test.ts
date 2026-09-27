/* The pure half of a formula morph: outlines, ring pairing, resampling, alignment, matching and fades. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePath, parseTransform, apply, resample, bestOffset, rotate, pairRings, area, perimeter, glyphsOf, match, pairGlyphs,
  tracksOf, frame, arcLerp, mixInk, plainTex, splitTex, runs, type Glyph, type Ring, type Pt, type SvgNode,
} from '../src/lib/fig/morphgeom';
import { typeset } from '../src/lib/fig/mathjax';

const near = (a: number, b: number, eps = 1e-6): void => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const square = (x: number, y: number, s: number, cw = true): Ring => (cw ? [[x, y], [x + s, y], [x + s, y + s], [x, y + s]] : [[x, y], [x, y + s], [x + s, y + s], [x + s, y]]);
const glyph = (shape: string, x: number, key: string | null = null): Glyph => ({ shape, key, rings: [square(x, 0, 10)], ink: 'rgb(0, 0, 0)' });

test('paths flatten to closed rings in absolute coordinates, relative commands included', () => {
  const rs = parsePath('M0 0L10 0V10H0Z m20 0 l5 0 0 5z');
  assert.equal(rs.length, 2);
  assert.deepEqual(rs[0], [[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.deepEqual(rs[1], [[20, 0], [25, 0], [25, 5]]);
  const q = parsePath('M0 0Q5 10 10 0T20 0Z', 4)[0];
  assert.deepEqual(q[4], [10, 0]); assert.deepEqual(q[8], [20, 0]);
  near(q[2][1], 5); near(q[6][1], -5);
});

test('transforms compose left to right as SVG does', () => {
  const m = parseTransform('translate(10,5) scale(2,-1)');
  assert.deepEqual(apply(m, [1, 1]), [12, 4]);
  assert.deepEqual(apply(parseTransform('scale(0.5)'), [4, 4]), [2, 2]);
});

test('resampling spaces points evenly by arc length around the loop', () => {
  const r = resample(square(0, 0, 10), 8);
  assert.equal(r.length, 8);
  assert.deepEqual(r.slice(0, 3), [[0, 0], [5, 0], [10, 0]]);
  assert.deepEqual(r[7], [0, 5]);
  assert.deepEqual(resample([[3, 3], [3, 3]], 4), [[3, 3], [3, 3], [3, 3], [3, 3]], 'a point stays a point');
});

test('the alignment offset undoes a cyclic shift, whatever the translation', () => {
  const a = resample(square(0, 0, 10), 16), b = rotate(a, 5).map((p): Pt => [p[0] + 100, p[1] - 40]);
  const o = bestOffset(a, b);
  assert.equal(o, 11);
  rotate(b, o).forEach((p, i) => { near(p[0] - 100, a[i][0]); near(p[1] + 40, a[i][1]); });
});

test('rings pair outer with outer and hole with hole, the short side padded at its partner', () => {
  const o = square(0, 0, 10), hole = square(3, 3, 4, false), other = square(20, 0, 10);
  assert.ok(area(o) > 0 && area(hole) < 0);
  const pairs = pairRings([o, hole], [other], 1);
  assert.equal(pairs.length, 2);
  pairs.forEach(([a, b]) => assert.equal(a.length, b.length));
  assert.equal(pairs[0][0].length, Math.ceil(perimeter(o)));
  const [src, dst] = pairs[1];
  assert.ok(dst.every((p) => p[0] === 5 && p[1] === 5), 'the missing hole is collapsed at the centre of the hole it pairs with');
  assert.ok(src.some((p) => p[0] === 3));
});

test('glyphs read keys from their innermost \\mk class and shapes from their outline', () => {
  const tree: SvgNode = { tag: 'svg', attrs: {}, children: [
    { tag: 'g', attrs: { transform: 'translate(100,0)', class: ' hd-mk=P' }, children: [
      { tag: 'path', attrs: { 'data-c': '50', d: 'M0 0L1 0L1 1Z' }, children: [] },
      { tag: 'g', attrs: { class: 'kv-x hd-mk=Q' }, children: [{ tag: 'rect', attrs: { x: '0', y: '0', width: '4', height: '1' }, children: [] }] },
    ] },
    { tag: 'path', attrs: { 'data-c': '50', d: 'M0 0L1 0L1 1Z', transform: 'scale(3)' }, children: [] },
  ] };
  const gs = glyphsOf(tree);
  assert.deepEqual(gs.map((g) => g.key), ['P', 'Q', null]);
  assert.equal(gs[0].shape, gs[2].shape, 'one outline at two sizes is one shape');
  assert.equal(gs[1].shape, 'rect');
  assert.deepEqual(gs[0].rings[0][1], [101, 0]);
  assert.deepEqual(gs[2].rings[0][2], [3, 3]);
});

test('matching: keys first (a keyMap pairs two keys), then shapes in reading order, the rest fades', () => {
  const src = [glyph('P', 0, 'P'), glyph('eq', 20), glyph('k', 40, 'k'), glyph('2', 60), glyph('2', 80)];
  const tgt = [glyph('P', 0, 'P'), glyph('eq', 30), glyph('2', 50), glyph('Q', 70, 'Q'), glyph('9', 200)];
  const m = match(src, tgt);
  assert.deepEqual(m.moves.map(([a, b]) => [a.map((g) => g.shape).join(), b.map((g) => g.shape).join()]), [['P', 'P'], ['eq', 'eq'], ['2', '2']]);
  assert.equal(m.moves[2][0][0], src[3], 'the first 2 in reading order moves');
  assert.deepEqual(m.out.map((g) => g.shape), ['k', '2']);
  assert.deepEqual(m.in.map((g) => g.shape), ['Q', '9']);
  near(m.shift[0], 0.04 * 210, 1e-9);
  const mk = match(src, tgt, { k: 'Q' });
  assert.ok(mk.moves.some(([a, b]) => a[0].key === 'k' && b[0].key === 'Q'));
  assert.deepEqual(mk.in.map((g) => g.shape), ['9']);
});

test('untagged glyphs match only within their segment and never across the formula', () => {
  const at = (shape: string, x: number, seg: number): Glyph => ({ ...glyph(shape, x), seg });
  const m = match([at('2', 0, 0), at('3', 20, 1)], [at('3', 0, 0), at('2', 20, 1)]);
  assert.equal(m.moves.length, 0, 'a 2 in one segment does not fly to a 2 in another');
  const far = match([at('2', 0, 0), at('x', 300, 0)], [at('x', 0, 0), at('2', 300, 0)]);
  assert.equal(far.moves.length, 0, 'a match that would cross most of the formula fades instead');
  const seq = (s: string): Glyph[] => [...s].map((c, i) => glyph(c, i * 10));
  assert.deepEqual(runs(seq('(1.00)(0.08)/22.9L'), seq('22.4Lat')), [[13, 0], [14, 1], [15, 2]],
    'a run of 2 2 . survives; a lone L after a changed numeral fades');
  const asked = match([glyph('k', 0, 'k'), glyph('x', 300)], [glyph('x', 0), glyph('Q', 300, 'Q')], { k: 'Q' });
  assert.equal(asked.moves.length, 1, 'a keyMap pair still makes the long move');
});

test('within a term, glyphs pair by shape, then in order, extras alone', () => {
  const ps = pairGlyphs([glyph('P', 0), glyph('1', 10)], [glyph('2', 0), glyph('P', 10), glyph('x', 30)]);
  assert.deepEqual(ps.map(([a, b]) => [a?.shape ?? null, b?.shape ?? null]), [['P', 'P'], ['1', '2'], [null, 'x']]);
});

test('the plan of fades: out toward the new parts, in from the old, lagged in reading order', () => {
  const m = match([glyph('a', 0), glyph('k', 40)], [glyph('a', 0), glyph('Q', 100)]);
  const tr = tracksOf(m, 1);
  assert.equal(tr.length, 3);
  assert.deepEqual(tr.map((t) => [t.opA, t.opB]), [[1, 1], [1, 0], [0, 1]]);
  assert.deepEqual(tr.map((t) => t.start), [0, 0.06, 0.12]);
  const [f0, f1] = [frame(tr, 0), frame(tr, 1)];
  assert.deepEqual(f0.map((d) => d.opacity), [1, 1, 0]);
  assert.deepEqual(f1.map((d) => d.opacity), [1, 0, 1]);
  near(Math.min(...f1[1].rings[0].map((p) => p[0])), 40 + 0.04 * 110, 1e-9);
  near(Math.min(...f0[2].rings[0].map((p) => p[0])), 100 - 0.04 * 110, 1e-9);
  const mid = frame(tr, 0.5), again = frame(tr, 0.5);
  assert.deepEqual(mid, again, 'a frame is a function of t alone');
});

test('an arc path leaves and lands on the straight path’s ends and bends between', () => {
  const a: Pt = [0, 0], b: Pt = [10, 0];
  const end = arcLerp(a, b, 1, Math.PI / 2);
  near(end[0], 10); near(end[1], 0);
  near(arcLerp(a, b, 0.5, Math.PI)[0], 5); near(Math.abs(arcLerp(a, b, 0.5, Math.PI)[1]), 5);
  assert.deepEqual(arcLerp(a, b, 0.5, 0), [5, 0]);
});

test('inks blend in rgb', () => {
  assert.equal(mixInk('rgb(0, 0, 0)', 'rgb(200, 100, 0)', 0.5), 'rgb(100 50 0 / 1.000)');
  assert.equal(mixInk('rgb(1, 2, 3)', 'rgb(1, 2, 3)', 0.5), 'rgb(1, 2, 3)');
});

test('plain text drops the colour and key wrappers and writes fractions out', () => {
  const macros = { '\\kP': '\\htmlClass{kv-pressure}{\\htmlData{sym=P}{P}}' };
  assert.equal(plainTex('\\mk{P}{\\kP} = \\frac{\\mk{n}{\\kP}\\,R\\,T}{\\mk{V}{V}}', macros), 'P = (P R T)/(V)');
  assert.equal(plainTex('\\mu_0 \\cdot 2\\ \\text{T}'), 'μ_0 · 2 T');
});

test('MathJax outlines carry \\mk keys and the book’s colour classes', () => {
  const macros = { '\\kP': '\\htmlClass{kv-pressure}{\\htmlData{sym=P}{P}}' };
  const r = typeset(macros, '\\mk{P}{\\kP_1} = \\frac{1}{2}', false);
  assert.match(r.markup, /kv-pressure/);
  assert.match(r.markup, /hd-sym=P/);
  const gs = glyphsOf(r.tree);
  assert.deepEqual(gs.map((g) => g.key), ['P', 'P', null, null, null, null]);
  assert.equal(gs[1].shape, gs[3].shape, 'the subscript 1 and the numerator 1 are one shape');
  assert.equal(gs[5].shape, 'rect');
  const boyle = glyphsOf(typeset(macros, '\\mk{P}{\\kP}\\mk{V}{V} = \\mk{k}{k}', false).tree);
  const late = glyphsOf(typeset(macros, '\\mk{P}{\\kP_1}\\mk{V}{V_1} = \\mk{P2}{\\kP_2}\\mk{V2}{V_2}', false).tree);
  const m = match(boyle, late);
  assert.equal(m.moves.length, 3);
  assert.deepEqual(m.out.map((g) => g.key), ['k']);
  assert.deepEqual([...new Set(m.in.map((g) => g.key))], ['P2', 'V2']);
});

test('an inline formula breaks after each top-level =, never inside a group', () => {
  assert.deepEqual(splitTex('P = \\frac{a = b}{c} = \\left( x = y \\right) = 3'), ['P =', '\\frac{a = b}{c} =', '\\left( x = y \\right) =', '3']);
  assert.deepEqual(splitTex('\\mk{eq}{=} x'), ['\\mk{eq}{=} x']);
});
