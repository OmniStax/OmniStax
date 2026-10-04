/* The referent palette: the colours a page gives the particular things its
   text and figures point at — two tugboats, three skaters, Firm A and Firm B.
   It is always thirty-six colours, taken from any palette that can give that
   many; by default the OKLab palette's own thirty-six. Colours are dealt per
   group of referents seen together (scopes.ts), in table order, so groups that
   never meet wear the same colours and each group's i-th referent is its
   referent i.

   In order, a group's i-th referent wears colour i. Smart, it tries colour i,
   then i + 1, i + 2 … round the palette, and wears the first that no earlier
   referent of the group wears and that stands at least the reader's target from
   every colour the group's scope shows and from every referent of the group dealt
   before it. A group in which any referent finds none is dealt farthest apart
   instead: each referent in turn takes the colour left that stands farthest from
   all of those. Pure throughout. */
import type { Hex, Hue } from './model';
import { type Offer, type PaletteId, PALETTES, pairsOf } from './palettes';
import { type DeltaE, type Seen, type SeenHue, type Vision, seenHue, seenHueDistance, seenDistance, seenOf } from './oklab';

export type ReferentId = string;
export type RefMode = 'order' | 'smart';
/* How a group was dealt: the mode asked for, or farthest apart where smart found no way. */
export type DealtMode = RefMode | 'farthest';
export type RefSettings = { readonly palette: PaletteId; readonly mode: RefMode; readonly target?: DeltaE };

export const REFERENT_COUNT = 36;

/* The nearest a smart referent may stand to the colours its group shows, which the reader sets. */
export const TARGET_DEFAULT: DeltaE = 0.12;
export const TARGET_MIN: DeltaE = 0.02;
export const TARGET_MAX: DeltaE = 0.25;
export const TARGET_STEP: DeltaE = 0.01;
export const clampTarget = (t: DeltaE): DeltaE => Math.min(TARGET_MAX, Math.max(TARGET_MIN, Math.round(t * 100) / 100));

/* Written out rather than taken from OKLAB, since palettes.ts reaches this module through model.ts and is
   not yet evaluated when this line runs. */
const OKLAB_ID = 'oklab' as PaletteId;
export const DEFAULT_REFERENTS: RefSettings = { palette: OKLAB_ID, mode: 'smart' };

export const isRefMode = (s: unknown): s is RefMode => s === 'order' || s === 'smart';
export const targetOf = (s: RefSettings): DeltaE => s.target ?? TARGET_DEFAULT;

/* The palettes that can give the referents their thirty-six. */
export const referentPalettes = (vision: Vision): readonly Offer[] =>
  PALETTES.flatMap((palette) => {
    const hues = pairsOf(palette, REFERENT_COUNT, vision);
    return hues ? [{ palette, hues }] : [];
  });

/* The thirty-six colours a setting names, else the default's when its palette is gone or cannot give them. */
export const referentHues = (s: RefSettings, vision: Vision): readonly Hue[] => {
  const pick = (id: PaletteId): readonly Hue[] | null => {
    const p = PALETTES.find((q) => q.id === id);
    return p ? pairsOf(p, REFERENT_COUNT, vision) : null;
  };
  return pick(s.palette) ?? (pick(OKLAB_ID) as readonly Hue[]);
};

export type RefHues = ReadonlyMap<ReferentId, Hue>;
type Slot = number;

const nearest = (p: SeenHue, others: readonly SeenHue[]): DeltaE =>
  others.reduce((m, q) => Math.min(m, seenHueDistance(p, q)), Infinity);

export const inOrderSlots = (count: number, n: number): readonly Slot[] => Array.from({ length: count }, (_, i) => i % n);

/* The smart walk: the slot each referent wears, or null where one finds none. */
export const smartSlots = (count: number, palette: readonly SeenHue[], shown: readonly SeenHue[], target: DeltaE): readonly Slot[] | null => {
  const n = palette.length;
  const clear = palette.map((p) => nearest(p, shown) >= target);
  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const fits = (j: Slot): boolean => clear[j] && !slots.includes(j) && slots.every((s) => seenHueDistance(palette[j], palette[s]) >= target);
    const slot = Array.from({ length: n }, (_, k) => (i + k) % n).find(fits);
    if (slot === undefined) return null;
    slots.push(slot);
  }
  return slots;
};

/* Farthest apart: each referent in turn takes the slot left that stands farthest from what the scope shows and
   from the referents dealt before it, the earlier slot on a tie; past the palette's length the slots come round again. */
export const farthestSlots = (count: number, palette: readonly SeenHue[], shown: readonly SeenHue[]): readonly Slot[] => {
  const room = palette.map((p) => nearest(p, shown));
  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const left = palette.map((_, j) => j).filter((j) => !slots.slice(slots.length - (slots.length % palette.length)).includes(j));
    const pick = left.reduce((best, j) => (room[j] > room[best] ? j : best), left[0]);
    slots.push(pick);
    palette.forEach((p, j) => { room[j] = Math.min(room[j], seenHueDistance(p, palette[pick])); });
  }
  return slots;
};

/* One group as the dealer reads it: its referents in table order and the colours its scope shows. */
export type GroupToDeal = { readonly ids: readonly ReferentId[]; readonly shown: readonly Hue[] };
export type DealtGroup = { readonly ids: readonly ReferentId[]; readonly hues: readonly Hue[]; readonly mode: DealtMode };
export type DealInput = { readonly palette: readonly Hue[]; readonly mode: RefMode; readonly vision: Vision; readonly target: DeltaE };

export const dealGroup = (g: GroupToDeal, { palette, mode, vision, target }: DealInput): DealtGroup => {
  const as = (slots: readonly Slot[], how: DealtMode): DealtGroup => ({ ids: g.ids, hues: slots.map((s) => palette[s]), mode: how });
  if (mode === 'order' || g.ids.length === 0) return as(inOrderSlots(g.ids.length, palette.length), 'order');
  const seenPalette = palette.map((h) => seenHue(h, vision));
  const shown = g.shown.map((h) => seenHue(h, vision));
  const smart = smartSlots(g.ids.length, seenPalette, shown, target);
  return smart ? as(smart, 'smart') : as(farthestSlots(g.ids.length, seenPalette, shown), 'farthest');
};

export const huesOfGroups = (groups: readonly DealtGroup[]): RefHues =>
  new Map(groups.flatMap((g) => g.ids.map((id, i) => [id, g.hues[i]] as const)));

/* The colour of an unnamed instance (`F.cat`): the palette after its group's own slots, wrapping, with every
   colour a referent of the group wears left out, then ordered farthest first: each next the colour farthest
   from what the figure has drawn, the group's referents and those before it. A group whose referents wear the
   whole palette gets it back. */
export const unnamedOrder = (palette: readonly Hue[], worn: readonly Hue[], referents: number, drawn: readonly Hex[], dark: boolean, vision: Vision): readonly Hex[] => {
  const n = palette.length;
  const rotated = Array.from({ length: n }, (_, k) => palette[(referents + k) % n]);
  const wornKeys = new Set(worn.map((h) => `${h.light}|${h.dark}`));
  const free = rotated.filter((h) => !wornKeys.has(`${h.light}|${h.dark}`));
  const hexes = (free.length ? free : rotated).map((h) => (dark ? h.dark : h.light));
  const seen: readonly Seen[] = hexes.map((x) => seenOf(x, vision));
  const anchors = [...drawn, ...worn.map((h) => (dark ? h.dark : h.light))].map((x) => seenOf(x, vision));
  const room = seen.map((p) => anchors.reduce((m, q) => Math.min(m, seenDistance(p, q)), Infinity));
  const order: number[] = [];
  while (order.length < hexes.length) {
    const left = hexes.map((_, j) => j).filter((j) => !order.includes(j));
    const pick = left.reduce((best, j) => (room[j] > room[best] ? j : best), left[0]);
    order.push(pick);
    seen.forEach((p, j) => { room[j] = Math.min(room[j], seenDistance(p, seen[pick])); });
  }
  return order.map((j) => hexes[j]);
};

export const pickWrapped = <T>(xs: readonly T[], i: number): T => xs[((Math.trunc(i) % xs.length) + xs.length) % xs.length];
