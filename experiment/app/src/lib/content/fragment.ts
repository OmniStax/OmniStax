/* The static HTML of one section: the text article and the exercises host.
   The same markup goes into the full page and into doc.html, so the two
   cannot drift. Ids are qualified by section so two sections share a DOM. */
import type { SectionSource } from './load';
import type { BookDTO, ChapterDTO } from './schema';
import { attributionOf, footerHtml } from './attribution';
import { type SpanId, qualifiedId, sectionId } from '../types/ids';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* An href already qualified by a section ("#16.1-demo-ruler", as the figure links are) is left alone. */
export const qualifyIds = (html: string, section: string): string =>
  html.replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${section}-${id}"`).replace(/href="#(?!\d+\.\d+-)([^"]+)"/g, (_, id: string) => `href="#${section}-${id}"`);

/* Book figure numbers as the prose writes them: "16.4". */
export type FigureNumber = string & { readonly __brand: 'FigureNumber' };
export const figureNumber = (s: string): FigureNumber => s as FigureNumber;

/* Every figure that keeps a book number, mapped to its qualified DOM id, from one section's text. */
export const figureIds = (html: string, section: string): ReadonlyMap<FigureNumber, SpanId> =>
  new Map([...html.matchAll(/<figure\b[^>]*\bid="([^"]+)"[^>]*\bdata-figure="([^"]+)"/g)].map(([, id, n]) => [figureNumber(n), qualifiedId(sectionId(section), id)]));

const REF = /\bFigures? \d+\.\d+(?:(?:,| and| or|, and|, or) \d+\.\d+)*/g;
const figLink = (n: string, figs: ReadonlyMap<FigureNumber, SpanId>, text: string): string => {
  const id = figs.get(figureNumber(n)); return id ? `<a class="figref" href="#${id}" data-figref="${n}">${text}</a>` : text;
};
const linkRun = (run: string, figs: ReadonlyMap<FigureNumber, SpanId>): string =>
  run.startsWith('Figure ') ? figLink(run.slice(7), figs, run) : run.replace(/\d+\.\d+/g, (n) => figLink(n, figs, n));

/* Wrap the prose's figure references in links. A run of text is skipped inside an <a> and inside a caption's
   eyebrow, which is a figure naming itself. The map is chapter-wide, so a reference may cross sections. */
export const linkFigureRefs = (html: string, figs: ReadonlyMap<FigureNumber, SpanId>): string => {
  if (figs.size === 0) return html;
  let a = 0, eyebrow = -1;   /* open <a> count; span depth since an eyebrow opened, −1 outside one */
  return html.split(/(<[^>]+>)/).map((part) => {
    if (!part.startsWith('<')) return a === 0 && eyebrow < 0 ? part.replace(REF, (run) => linkRun(run, figs)) : part;
    if (/^<a\b/i.test(part)) a += 1; else if (/^<\/a>/i.test(part)) a = Math.max(0, a - 1);
    else if (/^<span\b[^>]*\bclass="[^"]*\beyebrow\b/.test(part) && eyebrow < 0) eyebrow = 1;
    else if (/^<span\b/.test(part) && eyebrow >= 0) eyebrow += 1;
    else if (/^<\/span>/.test(part) && eyebrow >= 0) eyebrow = eyebrow === 1 ? -1 : eyebrow - 1;
    return part;
  }).join('');
};

/* Both articles end with the attribution: each is a tab of its own and may be the only thing on screen. */
const footer = (book: BookDTO, chapter: ChapterDTO, s: SectionSource): string => footerHtml(attributionOf(book, chapter, s.meta));

export const textArticle = (book: BookDTO, chapter: ChapterDTO, s: SectionSource): string => [
  `<article data-doc="${s.meta.id}/text" data-sec="${s.meta.id}" data-chapter="${chapter.dir}" data-title="${s.meta.id} Text" data-math="rendered">`,
  `<div class="eyebrow">Chapter ${esc(chapter.id)} · ${esc(chapter.title)} · ${s.meta.id}</div>`,
  `<h1>${esc(s.meta.title)}</h1>`,
  `<p class="lead">${s.meta.lead}</p>`,
  qualifyIds(s.textHtml, s.meta.id),
  footer(book, chapter, s),
  `</article>`,
].join('\n');

export const exercisesArticle = (book: BookDTO, chapter: ChapterDTO, s: SectionSource): string => [
  `<article data-doc="${s.meta.id}/exercises" data-sec="${s.meta.id}" data-chapter="${chapter.dir}" data-title="${s.meta.id} Exercises">`,
  `<section id="${s.meta.id}-exercises"><h2>Problems &amp; Exercises</h2>${s.exercisesLead ? `<p class="lead">${s.exercisesLead}</p>` : ''}<div class="exercises" data-place="end"></div></section>`,
  footer(book, chapter, s),
  `</article>`,
].join('\n');

/* The fragment carries its own data so a tab can be opened from it alone. */
export const sectionData = (s: SectionSource): string =>
  `<script type="application/json" data-section="${s.meta.id}">${JSON.stringify({ meta: s.meta, exercises: s.exercises }).replace(/</g, '\\u003c')}</script>`;

export const fragment = (book: BookDTO, chapter: ChapterDTO, s: SectionSource): string =>
  [textArticle(book, chapter, s), exercisesArticle(book, chapter, s), sectionData(s)].join('\n');
