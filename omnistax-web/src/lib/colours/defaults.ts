/* The book's default colours as `npm run colours:default` writes them into
   book.json: the hue-families palette for normal vision, assigned smart over
   the colour counts of every built page, and the order smart dealing walks the
   referent palette in. The Theme page's Apply smart runs the same assignment
   with the same seed, so a book whose stored default is fresh wears exactly
   what that button would give; the content check compares the two. */
import type { BookManifest, BookColoursDTO } from '../content/schema';
import { type Seed, assignSmart } from './assign';
import { fixedOf, pagesOfBook } from './counts';
import { NO_CHOICES, referentOrder } from './model';
import { DEFAULT_REFERENTS } from './referents';
import { DEFAULT_VISION, FAMILIES, pairsOf } from './palettes';

export const DEFAULT_SEED: Seed = 1;

export const defaultColours = (types: readonly string[], manifest: BookManifest): BookColoursDTO => {
  const vision = DEFAULT_VISION;
  const colours = pairsOf(FAMILIES, types.length, vision) ?? [];
  const pages = pagesOfBook(manifest);
  const smart = assignSmart({ categories: types, colours, pages, fixed: fixedOf(pages), vision, seed: DEFAULT_SEED });
  const assigned: BookColoursDTO = { palette: FAMILIES.id, vision, assign: Object.fromEntries([...smart].map(([k, h]) => [k, { light: h.light, dark: h.dark }])) };
  return { ...assigned, referentOrder: [...referentOrder({ ...manifest, colours: assigned }, NO_CHOICES, DEFAULT_REFERENTS.palette)] };
};

/* Whether what a book stores is what the script would write today. */
export const isFreshDefault = (stored: BookColoursDTO | undefined, fresh: BookColoursDTO): boolean =>
  stored !== undefined && stored.palette === fresh.palette && stored.vision === fresh.vision
  && JSON.stringify(stored.assign) === JSON.stringify(fresh.assign) && JSON.stringify(stored.referentOrder) === JSON.stringify(fresh.referentOrder);
