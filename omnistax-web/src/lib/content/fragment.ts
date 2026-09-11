/* The static HTML of one section: the text article and the exercises host.
   The same markup goes into the full page and into doc.html, so the two
   cannot drift. Ids are qualified by section so two sections share a DOM. */
import type { SectionSource } from './load';
import type { BookDTO, ChapterDTO, FigureEntry } from './schema';
import { attributionOf, footerHtml } from './attribution';
import { type SpanId, qualifiedId, sectionId } from '../types/ids';
import type { Neighbours } from './roles';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* An href already qualified by a page ("#16.1-sim-ruler", "#2.intro-fig-kestrel", as the figure links are) is left alone. */
const QUALIFIED_HREF = /href="#(?!(?:\d+\.\w+|intro|summary)-)([^"]+)"/g;
export const qualifyIds = (html: string, section: string): string =>
  html.replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${section}-${id}"`).replace(QUALIFIED_HREF, (_, id: string) => `href="#${section}-${id}"`);

/* The book's display width for a photograph rides on its <img> as data-width, and the stylesheet
   sizes the image from the custom property --book-w, so the build writes the one onto the other
   here, and no content file carries a style attribute. An image with no data-width is left alone
   and sits at its natural size. */
const IMG_WITH_WIDTH = /<img\b[^>]*\bdata-width="(\d+)"[^>]*>/g;
export const sizeImages = (html: string): string =>
  html.replace(IMG_WITH_WIDTH, (tag, width: string) => (tag.includes('--book-w') ? tag : `${tag.slice(0, -1)} style="--book-w:${width}">`));

/* Book figure numbers as the prose writes them: "16.4". */
export type FigureNumber = string & { readonly __brand: 'FigureNumber' };
export const figureNumber = (s: string): FigureNumber => s as FigureNumber;

/* A sim that folds several book figures prints every number it replaces, in the
   book's order and joined with " + ": "Figure 3.3 + 3.4 + 3.5". The order is
   numeric on both parts, so 2.9 comes before 2.10. That joined string is what
   the <figure>'s data-figure carries and what its eyebrow reads after "Figure ". */
const JOIN = ' + ';
const parts = (n: string): readonly number[] => n.split('.').map(Number);
const byBook = (a: string, b: string): number => { const [ca, fa] = parts(a), [cb, fb] = parts(b); return ca - cb || fa - fb; };
export const printedNumbers = (row: { readonly number?: string; readonly folds: readonly string[] }): string | undefined =>
  (row.number === undefined ? undefined : [row.number, ...row.folds].sort(byBook).join(JOIN));
/* The numbers a data-figure carries, one or several. */
export const splitNumbers = (printed: string): readonly FigureNumber[] => printed.split(JOIN).map((n) => figureNumber(n.trim()));

/* Every figure that keeps a book number, mapped to its qualified DOM id, from one section's text. A folded figure is reached from each of its numbers. */
export const figureIds = (html: string, section: string): ReadonlyMap<FigureNumber, SpanId> =>
  new Map([...html.matchAll(/<figure\b[^>]*\bid="([^"]+)"[^>]*\bdata-figure="([^"]+)"/g)]
    .flatMap(([, id, printed]) => splitNumbers(printed).map((n) => [n, qualifiedId(sectionId(section), id)] as const)));

/* The text one fragment of a head reads as: tags dropped, prerendered math back to the $…$ it was written as, entities decoded, whitespace collapsed.
   A tag walk, as in linkFigureRefs: KaTeX markup is a tree whose visual branch repeats the symbols, so inside it only the TeX annotation is kept. */
const KATEX = /^<span\b[^>]*\bclass="katex/;
const TEX = /^<annotation\b[^>]*x-tex/;
const unesc = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
export const plainText = (html: string): string => {
  let depth = 0, tex = false, out = '';   /* depth: elements open inside a katex span, 0 outside one; tex: the text that follows is an annotation's */
  html.split(/(<[^>]+>)/).forEach((part) => {
    if (!part.startsWith('<')) { out += tex ? `$${part.trim()}$` : depth === 0 ? part : ''; return; }
    if (depth === 0) { if (KATEX.test(part)) depth = 1; return; }
    depth += part.startsWith('</') ? -1 : part.endsWith('/>') ? 0 : 1;
    tex = TEX.test(part);
  });
  return unesc(out).replace(/\s+/g, ' ').trim();
};

/* A label stays one line: the first sentence, up to and including the first ., ? or ! that ends a word, cut with an ellipsis if it runs long. */
const CAP = 140;
const firstSentence = (text: string): string => {
  const s = (/^[\s\S]*?[.?!](?=\s|$)/.exec(text)?.[0] ?? text).trim();
  return s.length > CAP ? `${s.slice(0, CAP).trimEnd()}…` : s;
};

/* A figure with no head is named by its id, as the registry names its tab: "sim-shm-period" → "shm period". */
const figName = (local: string): string => local.replace(/^(sim|fig)-/, '').replace(/-/g, ' ');
const HEAD = /<div\b[^>]*\bclass="[^"]*\bsim-head\b[^"]*"[^>]*>([\s\S]*?)<\/div>/;
const EYEBROW = /<span\b[^>]*\bclass="[^"]*\beyebrow\b[^"]*"[^>]*>([\s\S]*?)<\/span>/;
/* The eyebrow, then the first sentence of the prose beside it: "Figure 16.9 · An object on a spring slides on a frictionless surface, as in Figure 16.9." */
const headLabel = (figure: string): string => {
  const head = HEAD.exec(figure); if (!head) return '';
  const eye = EYEBROW.exec(head[1]);
  const prose = eye ? head[1].slice(eye.index + eye[0].length) : head[1];
  return [eye ? plainText(eye[1]) : '', firstSentence(plainText(prose))].filter((p) => p !== '').join(' · ');
};

/* Every sim figure of one section's text with its label, in the order the section draws them. The id is local, as the section
   writes it: the text is qualified later, and a text already qualified gives the prefix back. */
export const figureList = (html: string, section: string): readonly FigureEntry[] =>
  [...html.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/g)]
    .filter(([, attrs]) => /\bclass="[^"]*\bsim\b[^"]*"/.test(attrs) && /\bid="/.test(attrs))
    .map(([, attrs, body]) => {
      const raw = /\bid="([^"]+)"/.exec(attrs)![1], id = raw.startsWith(`${section}-`) ? raw.slice(section.length + 1) : raw;
      return { id, label: headLabel(body) || figName(id) };
    });

/* A reference in the prose: "Figure 16.4", "Figures 16.4 and 16.9". The check reads the same pattern, so the two cannot drift. */
export const REF = /\bFigures? \d+\.\d+(?:(?:,| and| or|, and|, or) \d+\.\d+)*/g;
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
const footer = (book: BookDTO, s: SectionSource): string => footerHtml(attributionOf(book, s.meta));

/* The line above the title: the chapter and the section's number, or for a page of the chapter's own only the
   chapter, and for a page of the book's own the book. The chapter is null for the book's own pages. */
const eyebrow = (book: BookDTO, chapter: ChapterDTO | null, s: SectionSource): string => {
  if (chapter === null) return esc(book.title);
  const where = `Chapter ${esc(chapter.id)} · ${esc(chapter.title)}`;
  return s.role === 'section' ? `${where} · ${s.meta.id}` : where;
};
/* The attributes every article of a page carries: what page and chapter it belongs to, and the name its tab takes. */
const articleAttrs = (chapter: ChapterDTO | null, s: SectionSource, doc: 'text' | 'exercises', title: string): string =>
  `data-doc="${s.meta.id}/${doc}" data-sec="${s.meta.id}"${chapter === null ? '' : ` data-chapter="${chapter.dir}"`} data-title="${esc(title)}"`;
const textTitle = (s: SectionSource): string => (s.role === 'section' ? `${s.meta.id} Text` : s.meta.title);

/* The section's own summary, where the book prints one, stands at the end of the text as the book stands it (rule 21).
   Its id is the one local id the build keeps for itself, and the validator keeps the text off it. */
export const SUMMARY_ID = 'section-summary';
const summaryBlock = (s: SectionSource): string =>
  (s.summaryHtml === '' ? '' : `<section class="summary" id="${qualifiedId(sectionId(s.meta.id), SUMMARY_ID)}"><h2>Section summary</h2>${s.summaryHtml}</section>`);

/* The pages either side of this one, by address and by the name they are listed under. */
export type PageLink = { readonly url: string; readonly label: string };
export type PageNav = Neighbours<PageLink>;
/* The way to the page before and the page after, at the end of every text, above the credit: the reader
   turns the page here as they would in the book. A link's href is the page's own address, so the built page
   needs no script for it, and inside the shell such a link opens the page as a tab. A first page has only a
   way on and a last page only a way back; a page with neither prints no row. */
const pageNav = (nav: PageNav): string => {
  const link = (rel: 'prev' | 'next', page: PageLink, word: string): string =>
    `<a class="${rel}" rel="${rel}" href="${esc(page.url)}"><span class="eyebrow">${word}</span><span class="name">${esc(page.label)}</span></a>`;
  const prev = nav.prev ? link('prev', nav.prev, 'Previous') : '', next = nav.next ? link('next', nav.next, 'Next') : '';
  return prev === '' && next === '' ? '' : `<nav class="page-nav" aria-label="The pages before and after this one">${prev}${next}</nav>`;
};

export const textArticle = (book: BookDTO, chapter: ChapterDTO | null, s: SectionSource, nav: PageNav): string => [
  `<article ${articleAttrs(chapter, s, 'text', textTitle(s))} data-math="rendered">`,
  `<div class="eyebrow">${eyebrow(book, chapter, s)}</div>`,
  `<h1>${esc(s.meta.title)}</h1>`,
  ...(s.meta.lead === '' ? [] : [`<p class="lead">${s.meta.lead}</p>`]),
  sizeImages(qualifyIds(s.textHtml, s.meta.id)),
  summaryBlock(s),
  sectionEnd(s),
  pageNav(nav),
  footer(book, s),
  `</article>`,
].filter((line) => line !== '').join('\n');

/* The way on from the text: a button that opens a practice page on this
   section, beside the page, and one that opens its problem set. Both are
   plain markup the shell catches, so the built page needs no script of its
   own to be sent somewhere. A section with no problems ends at its text. */
const sectionEnd = (s: SectionSource): string => (s.exercises.length === 0 ? '' :
  `<div class="section-end"><button type="button" class="practise" data-practise-section="${s.meta.id}" title="Open a practice session on this section">Practise this section</button><a class="problems" href="#${s.meta.id}-exercises" data-open-doc="${s.meta.id}/exercises">Problems &amp; Exercises</a></div>`);

export const exercisesArticle = (book: BookDTO, chapter: ChapterDTO | null, s: SectionSource): string => [
  `<article ${articleAttrs(chapter, s, 'exercises', `${s.meta.id} Exercises`)}>`,
  `<section id="${s.meta.id}-exercises"><h2>Problems &amp; Exercises</h2>${s.exercisesLead ? `<p class="lead">${s.exercisesLead}</p>` : ''}<div class="exercises" data-place="end"></div></section>`,
  footer(book, s),
  `</article>`,
].join('\n');

/* The fragment carries its own data so a tab can be opened from it alone. */
export const sectionData = (s: SectionSource): string =>
  `<script type="application/json" data-section="${s.meta.id}">${JSON.stringify({ meta: s.meta, exercises: s.exercises }).replace(/</g, '\\u003c')}</script>`;

/* A section's fragment is its two documents and its data; an introduction or
   summary page sets no exercises and so has no problem set to open. The text
   carries the way to its neighbours, which the caller reads off the book. */
export const fragment = (book: BookDTO, chapter: ChapterDTO | null, s: SectionSource, nav: PageNav): string =>
  [textArticle(book, chapter, s, nav), ...(s.role === 'section' ? [exercisesArticle(book, chapter, s)] : []), sectionData(s)].join('\n');
