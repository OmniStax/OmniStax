/* Provenance per block, for a book joined from several works (the CS book's RULES, "Provenance per block").

       <section id="arraystack" data-source="ods" data-locator="ods:arrays#sec:arraystack">
       <section id="amortized" data-source="oiwiki" data-locator="oiwiki:basic/amortized-analysis#引入"
                data-ai="claude-opus-5-5 high" data-translated-from="zh">

   `data-source` names a row of book.json's `sources` by its id and `data-locator` the passage, in the
   work's own locator scheme. A <section> block carries them; a <figure>, a code set's <div> or a <pre>
   inside it may carry its own where it comes from another work, and otherwise is the block's. A block
   the AI wrote carries `data-ai` ("<model id> <effort>") and wears the AI mark; one the AI translated
   also carries `data-translated-from`, the BCP 47 tag of the language it was translated from, and the
   mark's hover and the footer say it is a translation. Where the work's `sources` row names its
   `language` and that is not the book's, a block of it with `data-ai` is a translation from it without
   saying so; `data-translated-from` on the block wins.

   The footer of such a book credits only the works a page names here and the origins of its exercises
   (attribution.ts). Pure: strings in, strings out. */
import type { BookDTO, BookSourceDTO, ExerciseDTO, ExerciseSourceDTO } from './schema';

export type Provenance = {
  readonly tag: string;            /* the element: section, figure, div, pre */
  readonly id?: string;
  readonly source?: string;
  readonly locator?: string;
  readonly ai?: string;
  readonly translatedFrom?: string;
};

const TAG = /<(section|figure|div|pre)\b([^>]*)>/g;
const attr = (attrs: string, name: string): string | undefined => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];

/* Every element of a text that says where it comes from, or who wrote or translated it, in the order the text has them. */
export const provenanceOf = (html: string): readonly Provenance[] =>
  Array.from(html.matchAll(TAG), ([, tag, attrs]) => {
    const source = attr(attrs, 'data-source'), locator = attr(attrs, 'data-locator'), translatedFrom = attr(attrs, 'data-translated-from');
    /* data-ai on a <pre> belongs to the code set (codeset.ts): only a block's is read here */
    const ai = tag === 'section' ? attr(attrs, 'data-ai') : undefined, id = attr(attrs, 'id');
    return { tag, ...(id === undefined ? {} : { id }), ...(source === undefined ? {} : { source }), ...(locator === undefined ? {} : { locator }), ...(ai === undefined ? {} : { ai }), ...(translatedFrom === undefined ? {} : { translatedFrom }) };
  }).filter((p) => p.source !== undefined || p.locator !== undefined || p.ai !== undefined || p.translatedFrom !== undefined);

/* What a block was translated from: its own data-translated-from, else, for a block the AI wrote from a work in another
   language than the book's, that work's language. */
type Langs = Pick<BookDTO, 'sources'> & { readonly language?: string };
const primary = (tag: string): string => tag.split('-')[0].toLowerCase();
export const translatedFromOf = (p: Pick<Provenance, 'source' | 'ai' | 'translatedFrom'>, book?: Langs): string | undefined => {
  if (p.translatedFrom !== undefined) return p.translatedFrom;
  if (p.ai === undefined || p.source === undefined || !book) return undefined;
  const lang = book.sources?.find((w) => w.id === p.source)?.language;
  return lang !== undefined && primary(lang) !== primary(book.language ?? 'en') ? lang : undefined;
};
/* A <section>'s attributes read as provenance, for the build's mark. */
export const blockOf = (attrs: string): Provenance => provenanceOf(`<section ${attrs}>`)[0] ?? { tag: 'section' };

/* A book credits per block where its works are named by id: book.json's `sources` rows carry ids. */
export const creditsPerBlock = (book: Pick<BookDTO, 'sources'>): boolean => !!book.sources?.some((w) => w.id !== undefined);

/* One work a page draws on, and the languages any of its passages were translated from. */
export type UsedWork = { readonly id: string; readonly translatedFrom: readonly string[] };

/* The works a page's text names, then its exercises' origins, each once, in the order the page meets them. */
export const usedWorks = (html: string, exercises: readonly Pick<ExerciseDTO, 'origin'>[] = [], book?: Langs): readonly UsedWork[] => {
  const out = new Map<string, Set<string>>();
  provenanceOf(html).forEach((p) => {
    if (p.source === undefined) return;
    const langs = out.get(p.source) ?? new Set<string>(); out.set(p.source, langs);
    const from = translatedFromOf(p, book);
    if (from) langs.add(from);
  });
  exercises.forEach((e) => { if (e.origin !== undefined && !out.has(e.origin)) out.set(e.origin, new Set()); });
  return [...out].map(([id, langs]) => ({ id, translatedFrom: [...langs] }));
};

/* The row a work is credited from: book.json's `sources`, else an exercise source of that id. */
export type WorkRow = BookSourceDTO | ExerciseSourceDTO;
export const workRow = (book: Pick<BookDTO, 'sources' | 'exerciseSources'>, id: string): WorkRow | undefined =>
  book.sources?.find((w) => w.id === id) ?? book.exerciseSources?.find((w) => w.id === id);
