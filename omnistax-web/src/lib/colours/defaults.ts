/* The book's default colours as `npm run colours:default` writes them into
   book.json: the hue-families palette for normal vision, assigned smart over
   the colour counts of every built page, and the order smart dealing walks the
   referent palette in. The Theme page's Apply smart runs the same assignment
   with the same seed, so a book whose stored default is fresh wears exactly
   what that button would give; the content check compares the two. */
import type { BookManifest, BookColoursDTO } from '../content/schema';
import { type Seed, assignSmart } from './assign';
import { fixedOf, pagesOfBook } from './counts';
import { type Hue, NO_CHOICES, normHex, referentOrder } from './model';
import { DEFAULT_REFERENTS } from './referents';
import { DEFAULT_VISION, FAMILIES, pairsOf } from './palettes';

export const DEFAULT_SEED: Seed = 1;

/* The book's pins laid over an assignment: each pinned type takes its pin, and a type the assignment had
   given that colour takes the pinned type's own colour, so no two types share one and nothing else moves.
   A pin for a type the assignment does not hold is left out. */
export type Pins = Readonly<Record<string, { readonly light: string; readonly dark: string }>>;
const sameHue = (a: { readonly light: string; readonly dark: string }, b: { readonly light: string; readonly dark: string }): boolean => normHex(a.light) === normHex(b.light) && normHex(a.dark) === normHex(b.dark);
export const withPins = <K extends string>(assigned: ReadonlyMap<K, Hue>, pins: Pins | undefined): ReadonlyMap<K, Hue> => {
  const out = new Map(assigned);
  Object.entries(pins ?? {}).forEach(([type, pin]) => {
    const own = out.get(type as K);
    if (!own) return;
    const other = [...out].find(([k, h]) => k !== type && sameHue(h, pin))?.[0];
    if (other !== undefined) out.set(other, own);
    out.set(type as K, { light: normHex(pin.light), dark: normHex(pin.dark) });
  });
  return out;
};

export const defaultColours = (types: readonly string[], manifest: BookManifest, pins: Pins | undefined = manifest.colours?.pins): BookColoursDTO => {
  const vision = DEFAULT_VISION;
  const colours = pairsOf(FAMILIES, types.length, vision) ?? [];
  const pages = pagesOfBook(manifest);
  const smart = withPins(assignSmart({ categories: types, colours, pages, fixed: fixedOf(pages), vision, seed: DEFAULT_SEED }), pins);
  const kept = Object.fromEntries(Object.entries(pins ?? {}).filter(([k]) => smart.has(k)).map(([k]) => [k, smart.get(k) as Hue]));
  const assigned: BookColoursDTO = { palette: FAMILIES.id, vision, assign: Object.fromEntries([...smart].map(([k, h]) => [k, { light: h.light, dark: h.dark }])), ...(Object.keys(kept).length ? { pins: kept } : {}) };
  return { ...assigned, referentOrder: [...referentOrder({ ...manifest, colours: assigned }, NO_CHOICES, DEFAULT_REFERENTS.palette)] };
};

/* Whether what a book stores is what the script would write today. */
export const isFreshDefault = (stored: BookColoursDTO | undefined, fresh: BookColoursDTO): boolean =>
  stored !== undefined && stored.palette === fresh.palette && stored.vision === fresh.vision
  && JSON.stringify(stored.assign) === JSON.stringify(fresh.assign) && JSON.stringify(stored.pins ?? {}) === JSON.stringify(fresh.pins ?? {})
  && JSON.stringify(stored.referentOrder) === JSON.stringify(fresh.referentOrder);
