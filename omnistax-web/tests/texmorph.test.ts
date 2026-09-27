/* The pure half of a formula morph: outlines, ring pairing, resampling, alignment, matching and fades. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePath, parseTransform, apply, resample, bestOffset, rotate, pairRings, area, perimeter, glyphsOf, match, pairGlyphs,
  tracksOf, frame, arcLerp, mixInk, plainTex, splitTex, lcs, retarget, keyEdges, bends, FADE_BY, type Glyph, type Ring, type Pt, type SvgNode,
} from '../src/lib/fig/morphgeom';
import { typeset } from '../src/lib/fig/mathjax';

const near = (a: number, b: number, eps = 1e-6): void => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const square = (x: number, y: number, s: number, cw = true): Ring => (cw ? [[x, y], [x + s, y], [x + s, y + s], [x, y + s]] : [[x, y], [x, y + s], [x + s, y + s], [x + s, y]]);
const glyph = (shape: string, x: number, key: string | null = null): Glyph => ({ shape, key, op: shape === 'eq' || shape === '+', rings: [square(x, 0, 10)], ink: 'rgb(0, 0, 0)' });

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

test('matching: keys by meaning (a keyMap sends one elsewhere), untagged operators in order, the rest fades', () => {
  const src = [glyph('P', 0, 'P'), glyph('eq', 20), glyph('k', 40, 'k'), glyph('2', 60), glyph('2', 80)];
  const tgt = [glyph('P', 0, 'P'), glyph('eq', 30), glyph('2', 50), glyph('Q', 70, 'Q'), glyph('9', 200)];
  const m = match(src, tgt);
  assert.deepEqual(m.moves.map(([a, b]) => [a.map((g) => g.shape).join(), b.map((g) => g.shape).join()]), [['P', 'P'], ['eq', 'eq']]);
  assert.deepEqual(m.out.map((g) => g.shape), ['k', '2', '2'], 'an untagged digit never matches, even a 2 into a 2');
  assert.deepEqual(m.in.map((g) => g.shape), ['2', 'Q', '9']);
  const mk = match(src, tgt, { k: 'Q' });
  assert.ok(mk.moves.some(([a, b]) => a[0].key === 'k' && b[0].key === 'Q'));
  const loose = match(src, tgt, {}, true);
  assert.equal(loose.moves.length, 3, 'loose, for a change of values only, lets untagged glyphs match by shape');
});

test('several keys bend together into one, and one bends out into several, each end reading as one', () => {
  const src = [glyph('a', 0, 'p2'), glyph('+', 20), glyph('b', 40, 'p3'), glyph('+', 60), glyph('c', 80, 'p4')];
  const tgt = [glyph('R', 30, 'Rp')];
  const m = match(src, tgt, { p2: 'Rp', p3: 'Rp', p4: 'Rp' });
  assert.deepEqual(m.moves.map(([a, b, wA, wB]) => [a[0].key, b[0].key, wA, wB]), [['p2', 'Rp', 1, 1], ['p3', 'Rp', 1, 0], ['p4', 'Rp', 1, 0]]);
  assert.deepEqual(m.out.map((g) => g.shape), ['+', '+']);
  const end = frame(tracksOf(m, 1), 1).filter((d) => d.opacity > 0);
  assert.equal(end.length, 1, 'the landed term is drawn once');
  const split = match([glyph('R', 30, 'Rs')], [glyph('a', 0, 'a'), glyph('b', 60, 'b')], { Rs: ['a', 'b'] });
  assert.deepEqual(split.moves.map(([a, b, wA, wB]) => [a[0].key, b[0].key, wA, wB]), [['Rs', 'a', 1, 1], ['Rs', 'b', 0, 1]]);
  assert.equal(frame(tracksOf(split, 1), 0).filter((d) => d.opacity > 0).length, 1, 'the source is drawn once before it splits');
  assert.deepEqual(keyEdges(['Rp', 'p2'], ['Rp'], { p2: 'Rp' }), [['p2', 'Rp']], 'a key the keyMap claims does not also match itself');
});

test('untagged operators match only within their segment and never across the formula', () => {
  const at = (shape: string, x: number, seg: number): Glyph => ({ ...glyph(shape, x), seg });
  const m = match([at('eq', 0, 0), at('+', 20, 1)], [at('+', 0, 0), at('eq', 20, 1)]);
  assert.equal(m.moves.length, 0, 'an = in one segment does not fly to an = in another');
  const far = match([at('eq', 0, 0), at('x', 300, 0)], [at('x', 0, 0), at('eq', 300, 0)]);
  assert.equal(far.moves.length, 0, 'a match that would cross most of the formula fades instead');
  const seq = (s: string): Glyph[] => [...s].map((c, i) => glyph(c, i * 10));
  assert.deepEqual(lcs(seq('a+b=c'), seq('+=')), [[1, 0], [3, 1]]);
  const asked = match([glyph('k', 0, 'k'), glyph('x', 300)], [glyph('x', 0), glyph('Q', 300, 'Q')], { k: 'Q' });
  assert.equal(asked.moves.length, 1, 'a keyed pair makes the long move');
});

test('within a term, glyphs bend in place: shared runs anchor, the rest pair in order between them', () => {
  const seq = (s: string): Glyph[] => [...s].map((c, i) => glyph(c, i * 10));
  const pairs = (a: string, b: string): string[] => pairGlyphs(seq(a), seq(b)).map(([g, h]) => (g?.shape ?? '_') + (h?.shape ?? '_'));
  assert.deepEqual(pairs('50', '51'), ['55', '01']);
  assert.deepEqual(pairs('2.00', '2.25'), ['22', '..', '02', '05']);
  assert.deepEqual(pairs('19', '91'), ['1_', '99', '_1'], 'digits never cross');
  assert.deepEqual(pairs('v', 'v1'), ['vv', '_1'], 'a term gaining a subscript grows it');
});

test('a running morph retargets from its present frame: no jump back, fades keep fading', () => {
  const m = match([glyph('5', 0, 'v'), glyph('k', 40, 'k')], [glyph('6', 10, 'v')]);
  const tr = tracksOf(m, 1, 0), t = 0.4, now = frame(tr, t);
  const r = retarget(tr, t);
  assert.equal(r.from.length, 1);
  assert.equal(r.from[0].key, 'v');
  assert.equal(r.fading.length, 1);
  const next = tracksOf(match(r.from, [glyph('7', 20, 'v')]), 1, 0);
  const at0 = frame([...r.fading, ...next], 0);
  assert.deepEqual(at0[0].rings, now[1].rings, 'the fading part stands where it was');
  near(at0[0].opacity, now[1].opacity);
  const moving = at0[1].rings[0], was = now[0].rings[0];
  near(Math.min(...moving.map((p) => p[0])), Math.min(...was.map((p) => p[0])), 1e-6);
  near(at0[1].opacity, 1);
  const end = frame(next, 1)[0].rings[0];
  near(Math.min(...end.map((p) => p[0])), 20, 1e-6);
});

test('the plan of fades: out toward the new parts, in from the old, lagged in reading order', () => {
  const m = match([glyph('a', 0, 'a'), glyph('k', 40)], [glyph('a', 0, 'a'), glyph('Q', 100)]);
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
  assert.deepEqual(gs.map((g) => g.op), [false, false, true, false, false, true], 'the = and the fraction bar are operators; the digits are not');
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

test('a key whose content changes past recognition crossfades where it stands, carried as it moves', () => {
  const seq = (s: string, key: string, x0: number): Glyph[] => [...s].map((c, i) => glyph(c, x0 + i * 10, key));
  assert.ok(bends(seq('50', 'n', 0), seq('51', 'n', 0)));
  assert.ok(bends(seq('2.00', 'n', 0), seq('2.25', 'n', 0)));
  assert.ok(!bends(seq('9.42x10-4', 'n', 0), seq('2.01', 'n', 0)));
  const tr = tracksOf(match(seq('9.42x10-4', 'B', 0), seq('2.01', 'B', 100)), 1);
  assert.equal(tr.length, 13, 'nine out, four in, none paired');
  const f = frame(tr, 1);
  assert.equal(f.filter((d) => d.opacity > 0).length, 4);
  const old = tr.find((t) => t.opA === 1)!, shiftX = old.b[0][0][0] - old.a[0][0][0];
  near(shiftX, 120 - 45, 1e-9);
});

test('parts with no counterpart are gone by 60 % of the window', () => {
  const tr = tracksOf(match([glyph('a', 0, 'a'), glyph('pi', 20, 'pi'), glyph('b', 40, 'b')], [glyph('a', 0, 'a'), glyph('b', 30, 'b')]), 1);
  const pi = tr.findIndex((t) => t.end.key === 'pi');
  assert.equal(frame(tr, FADE_BY)[pi].opacity, 0);
  assert.ok(frame(tr, FADE_BY).some((d, i) => i !== pi && d.rings[0][0][0] !== tr[i].b[0][0][0]), 'the survivors are still moving');
});
