/* Which category takes which of a palette's colours. In order, the i-th
   category the i-th colour. Smart, the assignment that keeps the colours a
   reader meets on one page apart: every page adds, for every two keys it shows,
   min(count₁, count₂) · φ(d), d the distance between their colours for the
   reader's vision and φ(d) = exp(−d / τ), and the assignment with the least sum
   wins. Conventions and facts are on the page with their own fixed colours, so
   a category is kept from them too.

   τ = 0.03 ΔE_OK. Two colours 0.02 apart read as one (φ ≈ 0.51), 0.08 is where
   small marks start to read as two (φ ≈ 0.07) and 0.15 is
   plainly different (φ ≈ 0.007): a pair near the floor outweighs dozens of
   comfortable ones, so the sum is ruled by the worst pairs of each page.

   The search: a greedy start, the most-weighted category first taking the
   colour that adds least, then simulated annealing over swaps of two
   categories' colours, each move costed in O(n). Seeded, so deterministic. */
import type { Hue, TypeKey } from './model';
import type { CountKey, PageCounts } from './counts';
import { type DeltaE, type SeenHue, type Vision, seenHue, seenHueDistance } from './oklab';

export type Seed = number;
export type Cost = number;
export type Assignment = ReadonlyMap<TypeKey, Hue>;

export const TAU: DeltaE = 0.03;
const phi = (d: DeltaE): Cost => Math.exp(-d / TAU);

export const assignInOrder = (categories: readonly TypeKey[], colours: readonly Hue[]): Assignment =>
  new Map(categories.flatMap((c, i) => (colours[i] ? [[c, colours[i]] as const] : [])));

/* mulberry32 */
const rng = (seed: Seed): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* The problem as numbers: W[i·n+j] the weight between categories i and j, U[i·n+a]
   the cost of category i wearing colour a against the fixed colours of its pages,
   D[a·n+b] = φ(distance) between colours a and b. */
type Problem = { readonly n: number; readonly W: Float64Array; readonly U: Float64Array; readonly D: Float64Array };

const problemOf = (
  categories: readonly TypeKey[], colours: readonly Hue[], pages: readonly PageCounts[],
  fixed: ReadonlyMap<CountKey, Hue>, vision: Vision,
): Problem => {
  const n = categories.length;
  const index = new Map(categories.map((c, i) => [c, i] as const));
  const fixedKeys = [...fixed.keys()];
  const fixedIndex = new Map(fixedKeys.map((k, i) => [k, i] as const));
  const W = new Float64Array(n * n);
  const F = new Float64Array(n * fixedKeys.length);
  pages.forEach((page) => {
    const cats = [...page].flatMap(([k, c]) => { const i = index.get(k); return i === undefined ? [] : [[i, c] as const]; });
    const fix = [...page].flatMap(([k, c]) => { const f = fixedIndex.get(k); return f === undefined ? [] : [[f, c] as const]; });
    cats.forEach(([i, ci]) => {
      cats.forEach(([j, cj]) => { if (i !== j) W[i * n + j] += Math.min(ci, cj); });
      fix.forEach(([f, cf]) => { F[i * fixedKeys.length + f] += Math.min(ci, cf); });
    });
  });
  const seen = colours.map((h) => seenHue(h, vision));
  const fixedSeen = fixedKeys.map((k) => seenHue(fixed.get(k) as Hue, vision));
  const D = new Float64Array(n * n);
  seen.forEach((p, a) => seen.forEach((q, b) => { D[a * n + b] = a === b ? 1 : phi(seenHueDistance(p, q)); }));
  const E = seen.map((p) => fixedSeen.map((q) => phi(seenHueDistance(p, q))));
  const U = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let a = 0; a < n; a++) {
    let u = 0;
    for (let f = 0; f < fixedKeys.length; f++) u += F[i * fixedKeys.length + f] * E[a][f];
    U[i * n + a] = u;
  }
  return { n, W, U, D };
};

/* The total cost of an assignment, perm[i] the colour category i wears. */
export const costOf = ({ n, W, U, D }: Problem, perm: Int32Array): Cost => {
  let c = 0;
  for (let i = 0; i < n; i++) {
    c += U[i * n + perm[i]];
    for (let j = i + 1; j < n; j++) c += W[i * n + j] * D[perm[i] * n + perm[j]];
  }
  return c;
};

const greedy = ({ n, W, U, D }: Problem): Int32Array => {
  const perm = new Int32Array(n).fill(-1);
  const free = new Set(Array.from({ length: n }, (_, a) => a));
  const weight = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => W[i * n + j]).reduce((s, w) => s + w, 0) + Array.from({ length: n }, (_, a) => U[i * n + a]).reduce((s, u) => s + u, 0) / n);
  const order = Array.from({ length: n }, (_, i) => i).sort((x, y) => weight[y] - weight[x] || x - y);
  const placed: number[] = [];
  order.forEach((i) => {
    const added = (a: number): Cost => placed.reduce((s, j) => s + W[i * n + j] * D[a * n + perm[j]], U[i * n + a]);
    const best = [...free].reduce((b, a) => (added(a) < added(b) ? a : b));
    perm[i] = best; free.delete(best); placed.push(i);
  });
  return perm;
};

/* The change in cost from swapping the colours of categories i and j. */
const swapDelta = ({ n, W, U, D }: Problem, perm: Int32Array, i: number, j: number): Cost => {
  const a = perm[i], b = perm[j];
  let d = U[i * n + b] - U[i * n + a] + U[j * n + a] - U[j * n + b];
  for (let k = 0; k < n; k++) {
    if (k === i || k === j) continue;
    const pk = perm[k];
    const diff = D[b * n + pk] - D[a * n + pk];
    d += (W[i * n + k] - W[j * n + k]) * diff;
  }
  return d;
};

const SWEEPS = 3000;

const anneal = (p: Problem, start: Int32Array, seed: Seed): Int32Array => {
  const { n } = p;
  if (n < 2) return start;
  const rand = rng(seed);
  const pick = (): readonly [number, number] => {
    const i = Math.floor(rand() * n);
    const j = (i + 1 + Math.floor(rand() * (n - 1))) % n;
    return [i, j];
  };
  const perm = Int32Array.from(start);
  const probes = Array.from({ length: 200 }, () => { const [i, j] = pick(); return Math.abs(swapDelta(p, perm, i, j)); });
  const t0 = probes.reduce((s, x) => s + x, 0) / probes.length || 1;
  const steps = SWEEPS * n;
  const cool = Math.pow(1e-4, 1 / steps);
  let temp = t0, cost = costOf(p, perm), bestCost = cost;
  let best = Int32Array.from(perm);
  for (let s = 0; s < steps; s++, temp *= cool) {
    const [i, j] = pick();
    const d = swapDelta(p, perm, i, j);
    if (d > 0 && rand() >= Math.exp(-d / temp)) continue;
    const a = perm[i]; perm[i] = perm[j]; perm[j] = a;
    cost += d;
    if (cost < bestCost - 1e-12) { bestCost = cost; best = Int32Array.from(perm); }
  }
  return best;
};

export type SmartInput = {
  readonly categories: readonly TypeKey[];
  readonly colours: readonly Hue[];                      /* exactly as many as categories */
  readonly pages: readonly PageCounts[];
  readonly fixed: ReadonlyMap<CountKey, Hue>;            /* the convention and fact colours by key */
  readonly vision: Vision;
  readonly seed?: Seed;
};

export const assignSmart = ({ categories, colours, pages, fixed, vision, seed = 1 }: SmartInput): Assignment => {
  if (colours.length < categories.length) throw new Error(`assignSmart: ${colours.length} colours for ${categories.length} categories`);
  const cs = colours.slice(0, categories.length);
  const p = problemOf(categories, cs, pages, fixed, vision);
  const perm = anneal(p, greedy(p), seed);
  return new Map(categories.map((c, i) => [c, cs[perm[i]]] as const));
};

/* The cost of any assignment under the same objective, for comparing two. */
export const assignmentCost = (a: Assignment, pages: readonly PageCounts[], fixed: ReadonlyMap<CountKey, Hue>, vision: Vision): Cost => {
  const categories = [...a.keys()];
  const p = problemOf(categories, categories.map((c) => a.get(c) as Hue), pages, fixed, vision);
  return costOf(p, Int32Array.from(categories, (_, i) => i));
};

/* For every page that shows two colours at least one of which is a category, the
   distance of its nearest such pair: how close the page comes to two things read as one. */
export const pageNearest = (a: Assignment, pages: readonly PageCounts[], fixed: ReadonlyMap<CountKey, Hue>, vision: Vision): readonly DeltaE[] => {
  const seen = new Map([...a, ...fixed].map(([k, h]) => [k, seenHue(h, vision)] as const));
  return pages.flatMap((page) => {
    const keys = [...page.keys()].filter((k) => seen.has(k));
    const pairs = keys.flatMap((x, i) => keys.slice(i + 1).flatMap((y) => (a.has(x) || a.has(y) ? [[x, y] as const] : [])));
    return pairs.length ? [Math.min(...pairs.map(([x, y]) => seenHueDistance(seen.get(x) as SeenHue, seen.get(y) as SeenHue)))] : [];
  });
};
