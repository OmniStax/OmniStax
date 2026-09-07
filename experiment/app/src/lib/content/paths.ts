/* getStaticPaths helpers shared by the page and the endpoints beside it. */
import { config } from '../../../omnia.config';
import { bookTree } from './load';
import type { BookTree, ChapterTree, SectionSource } from './load';

export type SectionRoute = { params: { book: string; chapter: string; section: string }; props: { tree: BookTree; chapter: ChapterTree; section: SectionSource } };
export type ChapterRoute = { params: { book: string; chapter: string }; props: { tree: BookTree; chapter: ChapterTree } };

export const tree = (): Promise<BookTree> => bookTree(config.content.root, config.content.bookId);

export const sectionRoutes = async (): Promise<SectionRoute[]> => {
  const t = await tree();
  return t.chapters.flatMap((chapter) => chapter.sections.map((section) => ({ params: { book: t.dto.id, chapter: chapter.dto.dir, section: section.meta.id }, props: { tree: t, chapter, section } })));
};
export const chapterRoutes = async (): Promise<ChapterRoute[]> => {
  const t = await tree();
  return t.chapters.map((chapter) => ({ params: { book: t.dto.id, chapter: chapter.dto.dir }, props: { tree: t, chapter } }));
};
export const json = (data: unknown): Response => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json; charset=utf-8' } });
