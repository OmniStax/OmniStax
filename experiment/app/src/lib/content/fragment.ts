/* The static HTML of one section: the text article and the exercises host.
   The same markup goes into the full page and into doc.html, so the two
   cannot drift. Ids are qualified by section so two sections share a DOM. */
import type { SectionSource } from './load';
import type { BookDTO, ChapterDTO } from './schema';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const qualifyIds = (html: string, section: string): string =>
  html.replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${section}-${id}"`).replace(/href="#([^"]+)"/g, (_, id: string) => `href="#${section}-${id}"`);

const footer = (book: BookDTO, s: SectionSource): string =>
  `<div class="footer">Text: ${esc(book.publisher)}, <em>${esc(book.title)}</em>, section ${s.meta.id}, ${esc(book.license)}. Demos, concept map and suggestions marked AI: Omnia. ${esc(s.meta.notes)}</div>`;

export const textArticle = (book: BookDTO, chapter: ChapterDTO, s: SectionSource): string => [
  `<article data-doc="${s.meta.id}/text" data-sec="${s.meta.id}" data-title="${s.meta.id} Text" data-math="rendered">`,
  `<div class="eyebrow">Chapter ${esc(chapter.id)} · ${esc(chapter.title)} · ${s.meta.id}</div>`,
  `<h1>${esc(s.meta.title)}</h1>`,
  `<p class="lead">${s.meta.lead}</p>`,
  qualifyIds(s.textHtml, s.meta.id),
  footer(book, s),
  `</article>`,
].join('\n');

export const exercisesArticle = (s: SectionSource): string => [
  `<article data-doc="${s.meta.id}/exercises" data-sec="${s.meta.id}" data-title="${s.meta.id} Exercises">`,
  `<section id="${s.meta.id}-exercises"><h2>Problems &amp; Exercises</h2><div class="exercises" data-place="end"></div></section>`,
  `</article>`,
].join('\n');

/* The fragment carries its own data so a tab can be opened from it alone. */
export const sectionData = (s: SectionSource): string =>
  `<script type="application/json" data-section="${s.meta.id}">${JSON.stringify({ meta: s.meta, exercises: s.exercises }).replace(/</g, '\\u003c')}</script>`;

export const fragment = (book: BookDTO, chapter: ChapterDTO, s: SectionSource): string =>
  [textArticle(book, chapter, s), exercisesArticle(s), sectionData(s)].join('\n');
