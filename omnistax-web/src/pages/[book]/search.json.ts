/* The text of the whole book, one block at a time, for the search in the rail:
   every built page in reading order with its lead, its prose and its own
   summary, as textindex.ts cuts them. Written once beside the book's pages and
   fetched the first time the reader searches, whichever book they are reading. */
import type { APIRoute } from 'astro';
import { tree, json } from '../../lib/content/paths';
import type { BookTree, ChapterTree, SectionSource } from '../../lib/content/load';
import { SUMMARY_ID } from '../../lib/content/fragment';
import { pagesOf } from '../../lib/content/roles';
import { textBlocks, type TextIndexDTO, type TextPageDTO } from '../../lib/content/textindex';

const html = (s: SectionSource): string => [
  s.meta.lead === '' ? '' : `<p>${s.meta.lead}</p>`,
  s.textHtml,
  s.summaryHtml === '' ? '' : `<section id="${SUMMARY_ID}"><h2>Section summary</h2>${s.summaryHtml}</section>`,
].join('\n');
const page = (s: SectionSource, chapter: ChapterTree | null): TextPageDTO =>
  ({ id: s.meta.id, title: s.meta.title, url: s.url, chapter: chapter?.dto.id ?? '', blocks: textBlocks(html(s), s.meta.id) });
const index = (t: BookTree): TextIndexDTO => ({
  pages: [
    ...(t.intro ? [page(t.intro, null)] : []),
    ...t.chapters.flatMap((c) => pagesOf(c).map((s) => page(s, c))),
    ...(t.summary ? [page(t.summary, null)] : []),
  ],
});

export const getStaticPaths = async () => [{ params: { book: (await tree()).dto.id } }];
export const GET: APIRoute = async () => json(index(await tree()));
