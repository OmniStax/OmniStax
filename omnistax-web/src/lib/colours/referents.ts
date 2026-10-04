/* The referent palette: the colours a section gives the particular things its
   text and figures point at — two tugboats, three skaters, Firm A and Firm B.
   It is always thirty-six colours, taken from any palette that can give that
   many; by default they are the thirty-six the OKLab sampler picks after the
   book's category colours, so each sits as far from the categories as the
   screen allows. A section deals them out in its referents table order, one
   colour per referent in every figure and in the text.

   In order, the i-th referent wears colour i. Smart, it tries colour i, then
   i + 1, i + 2 … round the palette, and wears the first that no earlier referent
   of the section wears and that stands at least D_MIN from every category,
   convention and fact colour of the page; a section in which any referent finds
   none is dealt in order instead. Pure throughout. */
import type { Hex, Hue, TypeKey } from './model';
import { type Offer, type Palette, type PaletteId, PALETTES, generatedPairs, pairsOf } from './palettes';
import { type DeltaE, type Vision, seenHue, seenHueDistance, seenDistance, seenOf } from './oklab';
import { oklabAfter } from './sample';
import { type PageCounts, fixedHueOf, isCategoryKey } from './counts';

export type ReferentId = string;
export type RefMode = 'order' | 'smart';
export type RefSettings = { readonly palette: PaletteId; readonly mode: RefMode };

export const REFERENT_COUNT = 36;

/* The nearest a smart referent may stand to a colour of its page, both themes
   measured through the reader's vision: for each vision the largest value, in
   steps of 0.01, at which scripts/referent-dmin.ts finds both books dealing
   every section smartly and moving at most a quarter of the referents off
   their own colour. */
export const D_MIN: Readonly<Record<Vision, DeltaE>> = { normal: 0.04, protan: 0.02, deutan: 0.02, tritan: 0.03 };

/* Where an unnamed instance's colours count as clear of what its figure has
   drawn; it only orders them, so it can stand stricter than D_MIN. */
export const UNNAMED_CLEAR: DeltaE = 0.08;

/* Written out rather than made with paletteId, since palettes.ts reaches this module through model.ts and is
   not yet evaluated when this line runs. */
export const AFTER_CATEGORIES = 'oklab-after' as PaletteId;
export const DEFAULT_REFERENTS: RefSettings = { palette: AFTER_CATEGORIES, mode: 'smart' };

export const isRefMode = (s: unknown): s is RefMode => s === 'order' || s === 'smart';

/* The OKLab sampling carried on past the book's category colours. */
export const afterCategories = (categories: readonly Hue[]): Palette => generatedPairs(
  AFTER_CATEGORIES,
  'OKLab after the categories',
  'The colours the OKLab palette picks next after the book’s categories, each as far from them and from one another as the screen allows for your vision.',
  (n, vision) => oklabAfter(categories, n, vision),
);

/* The palettes that can give the referents their thirty-six, the book's own continuation first. */
export const referentPalettes = (categories: readonly Hue[], vision: Vision): readonly Offer[] =>
  [afterCategories(categories), ...PALETTES].flatMap((palette) => {
    const hues = pairsOf(palette, REFERENT_COUNT, vision);
    return hues ? [{ palette, hues }] : [];
  });

/* The thirty-six colours a setting names, else the default's when its palette is gone or cannot give them. */
export const referentHues = (s: RefSettings, categories: readonly Hue[], vision: Vision): readonly Hue[] => {
  const own = afterCategories(categories);
  const chosen = [own, ...PALETTES].find((p) => p.id === s.palette);
  return (chosen && pairsOf(chosen, REFERENT_COUNT, vision)) ?? (pairsOf(own, REFERENT_COUNT, vision) as readonly Hue[]);
};

/* The colours a page shows besides its referents: its categories as the reader
   has them, and its conventions and facts as they are. */
export const pageColours = (counts: PageCounts, categoryHue: (type: TypeKey) => Hue | null): readonly Hue[] =>
  [...counts.keys()].flatMap((k) => (isCategoryKey(k) ? categoryHue(k) : fixedHueOf(k)) ?? []);

export type RefHues = ReadonlyMap<ReferentId, Hue>;
export type Dealt = { readonly hues: RefHues; readonly mode: RefMode };

const hueKey = (h: Hue): string => `${h.light}|${h.dark}`;

export const dealInOrder = (ids: readonly ReferentId[], palette: readonly Hue[]): RefHues =>
  new Map(ids.map((id, i) => [id, palette[i % palette.length]] as const));

/* Index of the colour each referent wears, or null where one finds none. */
const smartSlots = (count: number, clear: readonly boolean[]): readonly number[] | null => {
  const n = clear.length;
  const taken = new Set<number>();
  const slots: number[] = [];
  for (let i = 0; i < count; i++) {
    const slot = Array.from({ length: n }, (_, k) => (i + k) % n).find((j) => clear[j] && !taken.has(j));
    if (slot === undefined) return null;
    taken.add(slot); slots.push(slot);
  }
  return slots;
};

export type DealInput = {
  readonly ids: readonly ReferentId[];
  readonly palette: readonly Hue[];
  readonly page: readonly Hue[];
  readonly mode: RefMode;
  readonly vision: Vision;
  readonly dMin?: DeltaE;
};

export const dealReferents = ({ ids, palette, page, mode, vision, dMin = D_MIN[vision] }: DealInput): Dealt => {
  const inOrder: Dealt = { hues: dealInOrder(ids, palette), mode: 'order' };
  if (mode === 'order' || ids.length === 0) return inOrder;
  const seenPage = page.map((h) => seenHue(h, vision));
  const clear = palette.map((h) => { const p = seenHue(h, vision); return seenPage.every((q) => seenHueDistance(p, q) >= dMin); });
  const slots = smartSlots(ids.length, clear);
  return slots ? { hues: new Map(ids.map((id, i) => [id, palette[slots[i]]] as const)), mode: 'smart' } : inOrder;
};

/* The colour of an unnamed instance (`F.cat(i)`): the palette after the
   referents' own slots, wrapping, with every colour a referent of the section
   wears left out, the ones clear of the figure's drawn colours first and the
   rest farthest first. A section whose referents wear the whole palette gets it
   back. `i` wraps either way. */
export const unnamedOrder = (palette: readonly Hue[], worn: readonly Hue[], referents: number, drawn: readonly Hex[], dark: boolean, vision: Vision, clearAt = UNNAMED_CLEAR): readonly Hex[] => {
  const n = palette.length;
  const rotated = Array.from({ length: n }, (_, k) => palette[(referents + k) % n]);
  const wornKeys = new Set(worn.map(hueKey));
  const free = rotated.filter((h) => !wornKeys.has(hueKey(h)));
  const hexes = (free.length ? free : rotated).map((h) => (dark ? h.dark : h.light));
  const seenDrawn = drawn.map((d) => seenOf(d, vision));
  const room = (x: Hex): DeltaE => { const p = seenOf(x, vision); return Math.min(Infinity, ...seenDrawn.map((q) => seenDistance(p, q))); };
  const rooms = new Map(hexes.map((x) => [x, room(x)] as const));
  const near = (x: Hex): boolean => (rooms.get(x) as DeltaE) < clearAt;
  return [...hexes.filter((x) => !near(x)), ...hexes.filter(near).sort((x, y) => (rooms.get(y) as DeltaE) - (rooms.get(x) as DeltaE))];
};

export const pickWrapped = <T>(xs: readonly T[], i: number): T => xs[((Math.trunc(i) % xs.length) + xs.length) % xs.length];
