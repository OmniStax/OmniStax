/* How often a page shows each colour it is drawn in, which is what the smart
   assignment weighs two colours by: a category by its typed words, its
   variables rows and its figures, a convention by the figures that draw it, a
   fact likewise. A symbol counts as its type wherever the maths writes its
   macro. Referents are dealt their colours per section after the
   categories have theirs, so they are not counted here. */
import { type Hex, type Hue, normHex } from './model';
import { elementColor } from '../fig/elements';
import type { BookManifest, SectionEntry } from '../content/schema';

/* A category is its type id; a convention is `el:<symbol>`; a fact is its '#RRGGBB'. */
export type CountKey = string;
export type Count = number;
export type PageCounts = ReadonlyMap<CountKey, Count>;

export const conventionKey = (symbol: string): CountKey => `el:${symbol}`;
export const factKey = (hex: Hex): CountKey => normHex(hex);
export const isCategoryKey = (k: CountKey): boolean => !k.startsWith('el:') && !k.startsWith('#');

/* The fixed colour a convention or a fact key stands for, or nothing for a category. */
export const fixedHueOf = (k: CountKey): Hue | null => {
  if (k.startsWith('#')) return { light: k, dark: k };
  if (!k.startsWith('el:')) return null;
  const s = k.slice(3);
  return { light: normHex(elementColor(s, false)), dark: normHex(elementColor(s, true)) };
};

export const SPECTRUM = 'spectrum';

/* What of a page is counted: its prose with the concept spans already typed
   (text, lead, summary, exercises' lead) with the macros its maths writes, its
   figure rows and the types of its variables rows. */
export type CountedFigure = { readonly draws: readonly string[]; readonly conventions: readonly string[]; readonly facts: readonly string[] };
export type CountedPage = { readonly prose: readonly string[]; readonly figures: readonly CountedFigure[]; readonly rowTypes: readonly string[]; readonly macros: MacroTypes };

/* The type each of a page's macros wears there, by macro name; a macro set in ink is absent. */
export type MacroTypes = Readonly<Record<string, CountKey>>;
const TYPED = /<[^>]*\sdata-type="([^"]+)"/g;
const COMMAND = /\\[A-Za-z]+/g;
/* The types of the macros some prose writes, one per use, read off its TeX: raw, or rendered, where the TeX stands in the maths' annotation. */
export const macroKeys = (html: string, macros: MacroTypes): readonly CountKey[] =>
  Array.from(html.matchAll(COMMAND), ([name]) => (Object.hasOwn(macros, name) ? [macros[name]] : [])).flat();

export const pageCounts = (page: CountedPage): PageCounts => {
  const keys: readonly CountKey[] = [
    ...page.prose.flatMap((html) => [...Array.from(html.matchAll(TYPED), (m) => m[1]), ...macroKeys(html, page.macros)]),
    ...page.rowTypes,
    ...page.figures.flatMap((f) => [
      ...f.draws,
      ...f.conventions.map(conventionKey),
      ...f.facts.filter((x) => x !== SPECTRUM).map(factKey),
    ]),
  ];
  return keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<CountKey, Count>());
};

/* The counts as the manifest ships them, keys sorted so two builds write the same file. */
export const countsRecord = (c: PageCounts): Readonly<Record<CountKey, Count>> =>
  Object.fromEntries([...c].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
export const countsOfRecord = (r: Readonly<Record<CountKey, Count>>): PageCounts => new Map(Object.entries(r));

const entriesOf = (m: BookManifest): readonly SectionEntry[] => [
  ...(m.intro ? [m.intro] : []),
  ...m.chapters.flatMap((ch) => [...(ch.intro ? [ch.intro] : []), ...ch.sections, ...(ch.summary ? [ch.summary] : [])]),
  ...(m.summary ? [m.summary] : []),
];
/* Every built page's counts, as the manifest ships them. */
export const pagesOfBook = (m: BookManifest): readonly PageCounts[] => entriesOf(m).flatMap((e) => (e.counts ? [countsOfRecord(e.counts)] : []));
/* The fixed colour of every convention and fact the pages show. */
export const fixedOf = (pages: readonly PageCounts[]): ReadonlyMap<CountKey, Hue> =>
  new Map([...new Set(pages.flatMap((p) => [...p.keys()]))].flatMap((k) => { const h = fixedHueOf(k); return h ? [[k, h] as const] : []; }));
