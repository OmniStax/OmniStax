/* The book's default colours as `npm run colours:default` writes them into
   book.json: the hue-families palette for normal vision and the order smart
   dealing walks the referent palette in.

   The assignment is stable. A type that already has a stored colour keeps it, so a
   chapter that adds types never moves the hues readers and screenshots know; each new
   type takes, from the palette's colours no type wears, the one farthest from every
   colour shown on the pages it appears on. An existing type is moved only where its
   stored colour no longer works: it fails the text contrast floor on a ground, or it
   stands within COLLIDE of another type's colour on a page they share (the later type
   in the book's order moves). Every move is reported. A pin (book.json `colours.pins`)
   is kept even then. `--reshuffle` on the script throws the stored colours away and
   assigns all of them smart from scratch, pins laid over the result, the way the
   first run does. The Theme page's Apply smart, on the book's own palette and vision,
   runs the same stable assignment from the stored colours, so it gives the stored
   default; the content check compares the two. */
import type { BookManifest, BookColoursDTO } from '../content/schema';
import { type Seed, assignSmart } from './assign';
import { type CountKey, type PageCounts, fixedOf, isCategoryKey, pagesOfBook } from './counts';
import { type Hue, NO_CHOICES, normHex, referentOrder } from './model';
import { DEFAULT_REFERENTS } from './referents';
import { DEFAULT_VISION, FAMILIES, pairsOf } from './palettes';
import { type DeltaE, type Vision, INKS, distance, groundContrast } from './oklab';
import { CONTRAST_FLOOR } from './sample';

export const DEFAULT_SEED: Seed = 1;
/* Two types on one page nearer than this read as one colour, and the later one moves. */
export const COLLIDE: DeltaE = 0.03;
/* How many palette colours past the book's count a new type may choose among. */
const SPARE = 12;

type Pair = { readonly light: string; readonly dark: string };
export type Pins = Readonly<Record<string, Pair>>;
const hueOf = (p: Pair): Hue => ({ light: normHex(p.light), dark: normHex(p.dark) });
const sameHue = (a: Pair, b: Pair): boolean => normHex(a.light) === normHex(b.light) && normHex(a.dark) === normHex(b.dark);

/* The book's pins laid over an assignment: each pinned type takes its pin, and a type the assignment had
   given that colour takes the pinned type's own colour, so no two types share one and nothing else moves.
   A pin for a type the assignment does not hold is left out. */
export const withPins = <K extends string>(assigned: ReadonlyMap<K, Hue>, pins: Pins | undefined): ReadonlyMap<K, Hue> => {
  const out = new Map(assigned);
  Object.entries(pins ?? {}).forEach(([type, pin]) => {
    const own = out.get(type as K);
    if (!own) return;
    const other = [...out].find(([k, h]) => k !== type && sameHue(h, pin))?.[0];
    if (other !== undefined) out.set(other, own);
    out.set(type as K, hueOf(pin));
  });
  return out;
};

export type Move = { readonly type: string; readonly from: Hue | null; readonly to: Hue; readonly why: string };
export type StableInput = {
  readonly categories: readonly string[];
  readonly colours: readonly Hue[];                  /* the palette's colours, at least as many as categories */
  readonly pages: readonly PageCounts[];
  readonly fixed: ReadonlyMap<CountKey, Hue>;
  readonly vision: Vision;
  readonly stored: Readonly<Record<string, Pair>>;    /* the colours the book already wears */
  readonly pins?: Pins;
};
/* Existing types keep their colours; new ones (and the few that must move) take the free palette colour
   farthest from what their pages show. */
export const assignStable = ({ categories, colours, pages, fixed, vision, stored, pins = {} }: StableInput): { readonly assign: ReadonlyMap<string, Hue>; readonly moves: readonly Move[] } => {
  const moves: Move[] = [];
  const pagesOf = (t: string): readonly PageCounts[] => pages.filter((p) => p.has(t));
  const held = new Map<string, Hue>(categories.flatMap((t) => (stored[t] ? [[t, hueOf(stored[t])] as const] : [])));
  /* a pin new to the stored colours swaps with the type that wore it (withPins); a pin for a new type is set as it is */
  const out = new Map(withPins(held, pins));
  categories.forEach((t) => { if (pins[t] && !out.has(t)) out.set(t, hueOf(pins[t])); });
  held.forEach((h, t) => { const now = out.get(t); if (now && !sameHue(now, h)) moves.push({ type: t, from: h, to: now, why: pins[t] ? 'is pinned' : 'gives its colour to a pinned type' }); });
  /* what must move: a colour that no longer reads, or one that a page shows beside a near twin */
  const order = new Map(categories.map((t, i) => [t, i] as const));
  categories.forEach((t) => {
    const own = out.get(t);
    if (!own || pins[t]) return;
    const why = groundContrast(own) < CONTRAST_FLOOR ? `fails the text contrast floor ${CONTRAST_FLOOR}:1 on a ground`
      : (() => {
        const twin = categories.find((u) => u !== t && (pins[u] !== undefined || (order.get(u) ?? 0) < (order.get(t) ?? 0)) && out.has(u)
          && (sameHue(out.get(u) as Hue, own) || pagesOf(t).some((p) => p.has(u)) && distance(out.get(u) as Hue, own, vision) < COLLIDE));
        return twin === undefined ? null : `stands within ΔE ${COLLIDE} of ${twin} on a page they share`;
      })();
    if (why) { moves.push({ type: t, from: own, to: own, why }); out.delete(t); }
  });
  /* the new types and the moved ones, in the book's order, each from the colours no type wears */
  const free = colours.filter((c) => ![...out.values()].some((h) => sameHue(h, c)));
  categories.filter((t) => !out.has(t)).forEach((t) => {
    if (!free.length) return;
    const shown = (p: PageCounts): readonly Hue[] => [...p.keys()].flatMap((k) => (k === t ? [] : isCategoryKey(k) ? (out.has(k) ? [out.get(k) as Hue] : []) : fixed.has(k) ? [fixed.get(k) as Hue] : []));
    const own = pagesOf(t);
    const near = own.length ? own.flatMap(shown) : [...out.values()];
    const score = (c: Hue): DeltaE => Math.min(...[...near, ...INKS].map((h) => distance(c, h, vision)));
    const best = free.reduce((a, c) => (score(c) > score(a) ? c : a));
    free.splice(free.indexOf(best), 1);
    out.set(t, best);
    const was = moves.findIndex((m) => m.type === t);
    if (was >= 0) moves[was] = { ...moves[was], to: best };
    else moves.push({ type: t, from: null, to: best, why: 'is new' });
  });
  return { assign: new Map(categories.flatMap((t) => (out.has(t) ? [[t, out.get(t) as Hue] as const] : []))), moves };
};

export type DefaultResult = { readonly colours: BookColoursDTO; readonly moves: readonly Move[] };
/* What the script writes: stable from the stored colours unless reshuffle asks for a fresh smart assignment, or
   reorder for a fresh referent order alone (the types keep their colours), which also turns on referentAvoid. */
export const defaultAssignment = (types: readonly string[], manifest: BookManifest, o: { readonly pins?: Pins; readonly reshuffle?: boolean; readonly reorder?: boolean } = {}): DefaultResult => {
  const vision = DEFAULT_VISION;
  const pins = o.pins ?? manifest.colours?.pins;
  const prior = manifest.colours && manifest.colours.palette === FAMILIES.id && manifest.colours.vision === vision && !o.reshuffle ? manifest.colours : undefined;
  const pages = pagesOfBook(manifest), fixed = fixedOf(pages);
  let assign: ReadonlyMap<string, Hue>, moves: readonly Move[] = [];
  if (prior) {
    const colours = pairsOf(FAMILIES, types.length + SPARE, vision) ?? pairsOf(FAMILIES, types.length, vision) ?? [];
    ({ assign, moves } = assignStable({ categories: types, colours, pages, fixed, vision, stored: prior.assign, pins }));
  } else {
    const colours = pairsOf(FAMILIES, types.length, vision) ?? [];
    assign = withPins(assignSmart({ categories: types, colours, pages, fixed, vision, seed: DEFAULT_SEED }), pins);
  }
  const kept = Object.fromEntries(Object.keys(pins ?? {}).filter((k) => assign.has(k)).map((k) => [k, assign.get(k) as Hue]));
  const assigned: BookColoursDTO = { palette: FAMILIES.id, vision, assign: Object.fromEntries([...assign].map(([k, h]) => [k, { light: h.light, dark: h.dark }])), ...(Object.keys(kept).length ? { pins: kept } : {}) };
  /* the referent order is kept too once written, so referents do not change colour as pages are added */
  const refs = (o.reorder ? undefined : prior?.referentOrder) ?? referentOrder({ ...manifest, colours: assigned }, NO_CHOICES, DEFAULT_REFERENTS.palette);
  const avoid = o.reorder || prior?.referentAvoid ? { referentAvoid: true } : {};
  return { colours: { ...assigned, ...avoid, referentOrder: [...refs] }, moves };
};
export const defaultColours = (types: readonly string[], manifest: BookManifest, pins?: Pins): BookColoursDTO =>
  defaultAssignment(types, manifest, pins ? { pins } : {}).colours;

/* Whether what a book stores is what the script would write today. */
export const isFreshDefault = (stored: BookColoursDTO | undefined, fresh: BookColoursDTO): boolean =>
  stored !== undefined && stored.palette === fresh.palette && stored.vision === fresh.vision
  && JSON.stringify(stored.assign) === JSON.stringify(fresh.assign) && JSON.stringify(stored.pins ?? {}) === JSON.stringify(fresh.pins ?? {})
  && JSON.stringify(stored.referentOrder) === JSON.stringify(fresh.referentOrder) && Boolean(stored.referentAvoid) === Boolean(fresh.referentAvoid);
