/* The OKLab palette: as many category colours as a book needs, each as far as
   the screen allows from every one before it. The candidates are a fine grid of
   OKLCH colours whose light value reads on the light grounds and whose dark
   value, the same hue and chroma mirrored in lightness about PIVOT so a deep
   colour on the page is a bright one on the dark ground, reads on the dark
   grounds, both in gamut, and none of them the ink. The first is the candidate nearest a mid-lightness
   red; each next one is the candidate whose distance to the nearest already
   taken is the greatest, measured as the reader's vision measures it. So the
   colours for n are the colours for n − 1 with one more on the end, and the
   same vision always gives the same list. */
import type { Hue } from './model';
import {
  type Contrast, type DeltaE, type Lch, type SeenHue, type Vision,
  GROUNDS, contrastOf, hexOfLinear, inGamut, labOfLch, linearOf, linearOfLab, seenHue, seenHueDistance,
} from './oklab';

/* WCAG AA for body text, which a coloured word in the prose is. */
export const CONTRAST_FLOOR: Contrast = 4.5;
const PIVOT = 1.2;
const SEED: Lch = [0.5, 0.15, 30];
/* The page's ink and muted text (--ink, --muted), which a category colour must
   stand apart from as it stands apart from another category. */
const INKS: readonly Hue[] = [{ light: '#1B1F27', dark: '#E7E9EE' }, { light: '#5D6470', dark: '#9AA2AF' }];

const range = (from: number, to: number, step: number): readonly number[] =>
  Array.from({ length: Math.floor((to - from) / step + 1e-9) + 1 }, (_, i) => from + i * step);
const GRID_L = range(0.3, 0.6, 0.02);
const GRID_C = range(0.06, 0.3, 0.02);
const GRID_H = range(0, 357, 3);

const groundsOf = (theme: 'light' | 'dark') => GROUNDS[theme].map(linearOf);
const LIGHT_GROUNDS = groundsOf('light');
const DARK_GROUNDS = groundsOf('dark');

type Candidate = { readonly hue: Hue; readonly lch: Lch };
const candidateAt = ([L, C, h]: Lch): Candidate | null => {
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

const seedIndex = (cs: readonly Candidate[]): number => {
  const [sl, sa, sb] = labOfLch(SEED);
  const away = (c: Candidate): number => { const [l, a, b] = labOfLch(c.lch); return Math.hypot(l - sl, a - sa, b - sb); };
  return cs.reduce((best, c, i) => (away(c) < away(cs[best]) ? i : best), 0);
};

/* The sampling so far for one vision, grown in place as larger counts are asked for. */
type Sampling = { readonly seen: readonly SeenHue[]; readonly nearest: Float64Array; readonly picked: number[] };
const samplings = new Map<Vision, Sampling>();

const take = (s: Sampling, i: number): void => {
  s.picked.push(i);
  s.nearest[i] = -1;
  s.seen.forEach((c, j) => { if (s.nearest[j] >= 0) s.nearest[j] = Math.min(s.nearest[j], seenHueDistance(c, s.seen[i])); });
};
const farthest = (nearest: Float64Array): number =>
  nearest.reduce((best, d, i) => (d > nearest[best] ? i : best), 0);

const roomFrom = (seen: readonly SeenHue[], away: readonly SeenHue[]): Float64Array =>
  Float64Array.from(seen, (c) => Math.min(Infinity, ...away.map((k) => seenHueDistance(c, k))));

const samplingFor = (vision: Vision): Sampling => {
  const got = samplings.get(vision);
  if (got) return got;
  const cs = allCandidates();
  const seen = cs.map((c) => seenHue(c.hue, vision));
  const s: Sampling = { seen, nearest: roomFrom(seen, INKS.map((h) => seenHue(h, vision))), picked: [] };
  take(s, seedIndex(cs));
  samplings.set(vision, s);
  return s;
};

/* The first n colours of the OKLab palette for a vision; fewer only where the grid runs out. */
export const oklabHues = (n: number, vision: Vision): readonly Hue[] => {
  if (n < 1) return [];
  const s = samplingFor(vision);
  const cs = allCandidates();
  while (s.picked.length < Math.min(n, cs.length)) take(s, farthest(s.nearest));
  return s.picked.slice(0, n).map((i) => cs[i].hue);
};

/* The nearest two of a list of colours, for a reader's vision. */
export const minDistance = (hues: readonly Hue[], vision: Vision): DeltaE => {
  const seen = hues.map((h) => seenHue(h, vision));
  return seen.reduce((m, p, i) => seen.slice(i + 1).reduce((mm, q) => Math.min(mm, seenHueDistance(p, q)), m), Infinity);
};
