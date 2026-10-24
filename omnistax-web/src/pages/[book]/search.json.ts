/* The text of the whole book, one block at a time, for the search in the rail:
   every built page in reading order with its lead, its prose and its own
   summary, as textindex.ts cuts them. Written once beside the book's pages and
   fetched the first time the reader searches, whichever book they are reading. */
import type { APIRoute } from 'astro';
import { bookRoutes, json } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';
import type { BookTree, ChapterTree, SectionSource } from '../../lib/content/load';
import { SUMMARY_ID, bookLocale } from '../../lib/content/fragment';
import { type Locale, tIn } from '../../lib/i18n/index';
import { pagesOf } from '../../lib/content/roles';
import { textBlocks, withTokens, type TextIndexDTO, type TextPageDTO } from '../../lib/content/textindex';

/* the summary's head is the one the page prints, in the book's language */
const html = (s: SectionSource, locale: Locale): string => [
  s.meta.lead === '' ? '' : `<p>${s.meta.lead}</p>`,
  s.textHtml,
  s.summaryHtml === '' ? '' : `<section id="${SUMMARY_ID}"><h2>${tIn(locale, 'content.summary.heading')}</h2>${s.summaryHtml}</section>`,
].join('\n');
const page = (s: SectionSource, chapter: ChapterTree | null, locale: Locale): TextPageDTO =>
  withTokens({ id: s.meta.id, title: s.meta.title, url: s.url, chapter: chapter?.dto.id ?? '', blocks: textBlocks(html(s, locale), s.meta.id) });
const index = (t: BookTree, locale: Locale = bookLocale(t.dto)): TextIndexDTO => ({
  pages: [
    ...(t.intro ? [page(t.intro, null, locale)] : []),
    ...t.chapters.flatMap((c) => pagesOf(c).map((s) => page(s, c, locale))),
    ...(t.summary ? [page(t.summary, null, locale)] : []),
  ],
});

export const getStaticPaths = bookRoutes;
export const GET: APIRoute = async ({ props }) => json(index((props as BookProps).tree));
