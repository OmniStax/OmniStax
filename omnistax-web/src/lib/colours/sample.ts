/* The two generated palettes, each as many category colours as a book needs,
   every one reading as text on both grounds and in gamut in both themes, its
   dark value the same hue mirrored in lightness about PIVOT so a deep colour on
   the page is a bright one on the dark ground. Each next colour is the
   candidate whose distance to the nearest already taken, the inks among them,
   is the greatest, measured as the reader's vision measures it, and the first
   is the candidate nearest a mid-lightness red. So the colours for n are the
   colours for n − 1 with one more on the end, and the same vision always gives
   the same list.

   OKLab takes its candidates from a fine grid of OKLCH lightness, chroma and
   hue, none of them the ink. Hue families takes them on ten hues only, each at
   the strongest chroma both grounds allow (red no stronger than a brick), at every lightness where the colour
   stands the default target from the ink and the muted text in both themes. It
   fills the families first: one colour in each, then a second a clear step of
   lightness from the first, and only then a colour nearer a family's own. The
   hues are 32° apart where the screen gives strong colours, and 49° and 55°
   either side of cyan, whose text-dark colours are nearly grey, so that two
   families there would differ by less than ΔE 0.04. */
import type { Hex, Hue } from './model';
import {
  type Contrast, type DeltaE, type Lch, type Linear, type SeenHue, type Vision,
  GROUNDS, HUE_FAMILIES, INKS, contrastOf, hexOfLinear, hueGap, inGamut, labOf, labOfLch, lchOfLab, lightGap, linearOf, linearOfLab, seenHue, seenHueDistance,
} from './oklab';

/* WCAG AA for body text, which a coloured word in the prose is. */
export const CONTRAST_FLOOR: Contrast = 4.5;
const PIVOT = 1.2;
const SEED: Lch = [0.5, 0.15, 30];

const range = (from: number, to: number, step: number): readonly number[] =>
  Array.from({ length: Math.floor((to - from) / step + 1e-9) + 1 }, (_, i) => from + i * step);
const GRID_L = range(0.3, 0.6, 0.02);
const GRID_C = range(0.06, 0.3, 0.02);
const GRID_H = range(0, 357, 3);

/* Bright red reads as an error, so a colour within RED_SPAN of red's hue goes no stronger than a brick. */
const RED_HUE = 25, RED_SPAN = 20, RED_CHROMA = 0.14;
const tooRed = (C: number, h: number): boolean => C > RED_CHROMA && Math.abs(((h - RED_HUE + 540) % 360) - 180) <= RED_SPAN;

const groundsOf = (theme: 'light' | 'dark') => GROUNDS[theme].map(linearOf);
const LIGHT_GROUNDS = groundsOf('light');
const DARK_GROUNDS = groundsOf('dark');

type Candidate = { readonly hue: Hue; readonly lch: Lch };
const candidateAt = ([L, C, h]: Lch): Candidate | null => {
  if (tooRed(C, h)) return null;
  const light = linearOfLab(labOfLch([L, C, h]));
  const dark = linearOfLab(labOfLch([PIVOT - L, C, h]));
  if (!inGamut(light) || !inGamut(dark)) return null;
  const reads = LIGHT_GROUNDS.every((g) => contrastOf(light, g) >= CONTRAST_FLOOR) && DARK_GROUNDS.every((g) => contrastOf(dark, g) >= CONTRAST_FLOOR);
  return reads ? { hue: { light: hexOfLinear(light), dark: hexOfLinear(dark) }, lch: [L, C, h] } : null;
};

let candidates: readonly Candidate[] | null = null;
const allCandidates = (): readonly Candidate[] => {
  candidates ??= GRID_L.flatMap((L) => GRID_C.flatMap((C) => GRID_H.flatMap((h) => candidateAt([L, C, h]) ?? [])));
  return candidates;
};

export const FAMILY_HUES: readonly number[] = [23, 55, 87, 119, 151, 200, 255, 287, 319, 351];
const FAMILY_L = range(0.26, 0.6, 0.005);
const FAMILY_C = range(0.3, 0.06, -0.005);
/* The default target (referents.ts), under which the assignment reads a colour as the ink. */
const INK_ROOM: DeltaE = 0.12;
/* A hex that rounds a colour off its family's hue by more than this is not of it. */
const HUE_SLACK = 1;

/* The strongest colour of a hue at a lightness that, as a hex, reads on a theme's grounds and keeps its hue. */
const strongest = (L: number, h: number, grounds: readonly Linear[]): Hex | null => {
  for (const C of FAMILY_C) {
    if (tooRed(C, h)) continue;
    const exact = linearOfLab(labOfLch([L, C, h]));
    if (!inGamut(exact)) continue;
    const hex = hexOfLinear(exact), rgb = linearOf(hex);
    if (grounds.every((g) => contrastOf(rgb, g) >= CONTRAST_FLOOR) && hueGap(labOf(hex), labOfLch([L, C, h]), 0) <= HUE_SLACK) return hex;
  }
  return null;
};
type FamilyCandidate = Candidate & { readonly family: number };
const familyAt = (L: number, h: number, family: number): FamilyCandidate | null => {
  const light = strongest(L, h, LIGHT_GROUNDS), dark = strongest(PIVOT - L, h, DARK_GROUNDS);
  if (!light || !dark) return null;
  const hue = { light, dark };
  const seen = seenHue(hue, 'normal');
  return INKS.every((k) => seenHueDistance(seen, seenHue(k, 'normal')) >= INK_ROOM) ? { hue, lch: lchOfLab(labOf(hue.light)), family } : null;
};

let families: readonly FamilyCandidate[] | null = null;
const familyCandidates = (): readonly FamilyCandidate[] => {
  families ??= FAMILY_HUES.flatMap((h, f) => FAMILY_L.flatMap((L) => familyAt(L, h, f) ?? []));
  return families;
};

const seedIndex = (cs: readonly Candidate[], among: readonly number[]): number => {
  const [sl, sa, sb] = labOfLch(SEED);
  const away = (c: Candidate): number => { const [l, a, b] = labOfLch(c.lch); return Math.hypot(l - sl, a - sa, b - sb); };
  return among.reduce((best, i) => (away(cs[i]) < away(cs[best]) ? i : best));
};

/* The sampling so far for one vision, grown in place as larger counts are asked for. */
type Sampling = { readonly seen: readonly SeenHue[]; readonly nearest: Float64Array; readonly picked: number[]; readonly next: (s: Sampling) => number };

const take = (s: Sampling, i: number): void => {
  s.picked.push(i);
  s.nearest[i] = -1;
  s.seen.forEach((c, j) => { if (s.nearest[j] >= 0) s.nearest[j] = Math.min(s.nearest[j], seenHueDistance(c, s.seen[i])); });
};
const farthestOf = (nearest: Float64Array, among: readonly number[]): number =>
  among.reduce((best, i) => (nearest[i] > nearest[best] ? i : best));
const farthest = ({ nearest }: Sampling): number => farthestOf(nearest, Array.from(nearest, (_, i) => i));

const roomFrom = (seen: readonly SeenHue[], away: readonly SeenHue[]): Float64Array =>
  Float64Array.from(seen, (c) => Math.min(Infinity, ...away.map((k) => seenHueDistance(c, k))));

type Plan = { readonly first: number; readonly next: (s: Sampling) => number };
const sampler = <C extends Candidate>(pool: () => readonly C[], plan: (cs: readonly C[], seen: readonly SeenHue[], inks: readonly SeenHue[]) => Plan) => {
  const samplings = new Map<Vision, Sampling>();
  return (n: number, vision: Vision): readonly Hue[] => {
    if (n < 1) return [];
    const cs = pool();
    let s = samplings.get(vision);
    if (!s) {
      const seen = cs.map((c) => seenHue(c.hue, vision));
      const inks = INKS.map((h) => seenHue(h, vision));
      const { first, next } = plan(cs, seen, inks);
      s = { seen, nearest: roomFrom(seen, inks), picked: [], next };
      take(s, first);
      samplings.set(vision, s);
    }
    while (s.picked.length < Math.min(n, cs.length)) take(s, s.next(s));
    return s.picked.slice(0, n).map((i) => cs[i].hue);
  };
};

/* The colours each family holds a clear step of lightness apart, as many as its range allows, placed so that
   they crowd each other and the inks least: from the darkest steps and from the lightest, each in turn moves to
   the step of its family where the sum of exp(−d / τ) over the others is least, until none moves, and the
   start that ends less crowded wins. τ = 0.02, sharper than the assignment's, so the nearest pair rules. */
const ROUNDS = 20;
const phi = (d: DeltaE): number => Math.exp(-d / 0.02);
const clearSteps = (cs: readonly FamilyCandidate[], seen: readonly SeenHue[], inks: readonly SeenHue[]): readonly number[] => {
  const normal = cs.map((c) => seenHue(c.hue, 'normal'));
  const clear = (i: number, j: number): boolean => lightGap(normal[i], normal[j]) >= HUE_FAMILIES.lightness;
  const pools = FAMILY_HUES.map((_, f) => cs.flatMap((c, i) => (c.family === f ? [i] : [])));
  const inkRoom = roomFrom(seen, inks);
  const crowd = (i: number, others: readonly number[]): number => others.reduce((m, j) => m + phi(seenHueDistance(seen[i], seen[j])), phi(inkRoom[i]));
  const settle = (steps: number[][]): readonly number[] => {
    for (let round = 0, moved = true; moved && round < ROUNDS; round++) {
      moved = false;
      steps.forEach((own, f) => own.forEach((i, k) => {
        const others = steps.flat().filter((j) => j !== i);
        const best = pools[f].filter((c) => own.every((j, m) => m === k || clear(c, j))).reduce((b, c) => (crowd(c, others) < crowd(b, others) - 1e-12 ? c : b), i);
        if (best !== i) { own[k] = best; moved = true; }
      }));
    }
    return steps.flat();
  };
  const greedy = (pool: readonly number[]): number[] => pool.reduce<number[]>((got, i) => (got.every((j) => clear(i, j)) ? [...got, i] : got), []);
  const total = (xs: readonly number[]): number => xs.reduce((t, i) => t + crowd(i, xs.filter((j) => j !== i)), 0);
  const starts = [pools.map(greedy), pools.map((p) => greedy([...p].reverse()))].map(settle);
  return starts.reduce((b, x) => (total(x) < total(b) ? x : b));
};

/* Hue families: the clear steps first, farthest among those of a family not yet used and then among the rest;
   then any candidate, farthest. */
const familyPlan = (cs: readonly FamilyCandidate[], seen: readonly SeenHue[], inks: readonly SeenHue[]): Plan => {
  const steps = clearSteps(cs, seen, inks);
  const next = ({ nearest, picked }: Sampling): number => {
    const left = steps.filter((i) => nearest[i] >= 0);
    if (!left.length) return farthestOf(nearest, Array.from(nearest, (_, i) => i));
    const used = new Set(picked.map((i) => cs[i].family));
    const fresh = left.filter((i) => !used.has(cs[i].family));
    return farthestOf(nearest, fresh.length ? fresh : left);
  };
  return { first: seedIndex(cs, steps.filter((i) => cs[i].family === 0)), next };
};

/* The first n colours of the OKLab palette for a vision; fewer only where the grid runs out. */
export const oklabHues = sampler(allCandidates, (cs) => ({ first: seedIndex(cs, cs.map((_, i) => i)), next: farthest }));
/* The first n colours of the hue-families palette for a vision; fewer only where its candidates run out. */
export const familyHues = sampler(familyCandidates, familyPlan);

/* The nearest two of a list of colours, for a reader's vision. */
export const minDistance = (hues: readonly Hue[], vision: Vision): DeltaE => {
  const seen = hues.map((h) => seenHue(h, vision));
  return seen.reduce((m, p, i) => seen.slice(i + 1).reduce((mm, q) => Math.min(mm, seenHueDistance(p, q)), m), Infinity);
};
