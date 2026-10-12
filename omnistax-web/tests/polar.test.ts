/* Calculus Chapter 11's figlib part: polar points, traced curves, sectors and the book's areas and lengths. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xy, polarPath, runs, unwrap, nearest, aim, sectors, area, length, chords, under, strips, extent } from '../src/lib/fig/polar';

const near = (a: number, b: number, tol: number): void => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);
const PI = Math.PI;

test('polar points convert as Equation 11.7 says, a negative r lying behind the pole (Calculus 11.3)', () => {
  const [x, y] = xy(-2, (4 * PI) / 3); near(x, 1, 1e-12); near(y, Math.sqrt(3), 1e-12);
  const [u, v] = xy(6, (-5 * PI) / 6); near(u, -3 * Math.sqrt(3), 1e-12); near(v, -3, 1e-12);
  const c = polarPath((t) => 4 * Math.sin(t));
  for (let t = 0; t < 2 * PI; t += 0.3) { const [p, q] = c(t); near(p * p + (q - 2) ** 2, 4, 1e-9); }
});

test('the book’s polar areas and arc lengths (Calculus 11.4)', () => {
  near(area((t) => 3 * Math.sin(2 * t), 0, PI / 2), (9 * PI) / 8, 1e-9);
  near(area((t) => 1 - Math.cos(t), 0, 2 * PI), (3 * PI) / 2, 1e-9);
  near(area((t) => 6 * Math.sin(t), PI / 6, (5 * PI) / 6) - area((t) => 2 + 2 * Math.sin(t), PI / 6, (5 * PI) / 6), 4 * PI, 1e-8);
  near(length(polarPath((t) => 2 + 2 * Math.cos(t)), 0, 2 * PI), 16, 1e-4);
  near(length(polarPath((t) => 3 * Math.sin(t)), 0, PI), 3 * PI, 1e-4);
});

test('sectors sum to the polar area as n grows, with rᵢ = f(θᵢ)', () => {
  const f = (t: number): number => 3 * Math.sin(2 * t);
  const s = sectors(f, 0, PI / 2, 4);
  assert.equal(s.cells.length, 4); near(s.cells[0].r, f(PI / 8), 1e-12); near(s.cells[3].t1, PI / 2, 1e-12);
  near(sectors(f, 0, PI / 2, 400).sum, (9 * PI) / 8, 1e-3);
});

test('the book’s parametric areas and lengths, and their Riemann sums (Calculus 11.2)', () => {
  const cyc = (t: number) => [t - Math.sin(t), 1 - Math.cos(t)] as const;
  near(under(cyc, 0, 2 * PI), 3 * PI, 1e-6);
  near(strips(cyc, 0, 2 * PI, 2000).sum, 3 * PI, 1e-2);
  const hyp = (t: number) => [3 * Math.cos(t) + Math.cos(3 * t), 3 * Math.sin(t) - Math.sin(3 * t)] as const;
  near(under(hyp, 0, PI), -3 * PI, 1e-6);
  const semi = (t: number) => [3 * Math.cos(t), 3 * Math.sin(t)] as const;
  near(length(semi, 0, PI), 3 * PI, 1e-5);
  near(chords(semi, 0, PI, 2), 6 * Math.SQRT2, 1e-12);
  const e = extent(semi, 0, PI); near(e.x[0], -3, 1e-9); near(e.y[1], 3, 1e-4);
});

test('a dragged angle winds on, a point behind the pole stays behind it, and a grip follows its curve', () => {
  near(unwrap(0.1, 6.3), 0.1 + 2 * PI, 1e-12);
  near(unwrap(-3, 3), -3 + 2 * PI, 1e-12);
  const a = aim([1, 1], 0.5, 2); near(a.th, PI / 4, 1e-12); near(a.r, Math.SQRT2, 1e-12);
  const b = aim([1, 0], PI + 0.1, -1); near(b.th, PI, 1e-12); near(b.r, -1, 1e-12);
  const c = polarPath((t) => 4 * Math.sin(t));
  near(nearest(c, xy(4 * Math.sin(1), 1), 0.8, 0, 2 * PI, PI), 1, 0.02);
  assert.equal(runs(polarPath((t) => 3 / (1 + 2 * Math.cos(t))), 0, 2 * PI, 600, 20).length >= 2, true);
});
