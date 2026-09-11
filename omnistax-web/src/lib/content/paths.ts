/* getStaticPaths helpers shared by the page and the endpoints beside it. */
import { config } from '../../../omnistax.config';
import { bookTree } from './load';
import type { BookTree, ChapterTree, SectionSource } from './load';
import { type FrontRole, pageDir, pagesOf } from './roles';

/* One page of the book as a route: a section or a chapter's own introduction
   or summary, whose chapter is beside it, or one of the book's own pages,
   which belongs to no chapter. */
export type PageProps = { tree: BookTree; chapter: ChapterTree | null; section: SectionSource };
export type SectionRoute = { params: { book: string; chapter: string; section: string }; props: PageProps };
export type FrontRoute = { params: { book: string }; props: PageProps };
export type ChapterRoute = { params: { book: string; chapter: string }; props: { tree: BookTree; chapter: ChapterTree } };

export const tree = (): Promise<BookTree> => bookTree(config.content.root, config.content.bookId);

/* Every page under a chapter: its sections at their numbers, its introduction and summary at their folder names. */
export const sectionRoutes = async (): Promise<SectionRoute[]> => {
  const t = await tree();
  return t.chapters.flatMap((chapter) => pagesOf(chapter).map((section) => ({ params: { book: t.dto.id, chapter: chapter.dto.dir, section: pageDir(section.meta.id) }, props: { tree: t, chapter, section } })));
};
/* The sections alone: what has a problem set of its own to serve. */
export const problemSetRoutes = async (): Promise<SectionRoute[]> => (await sectionRoutes()).filter((r) => r.props.section.role === 'section');
/* The book's own introduction or summary, where it is built: one route, or none. */
export const frontRoutes = (role: FrontRole) => async (): Promise<FrontRoute[]> => {
  const t = await tree();
  const section = t[role];
  return section ? [{ params: { book: t.dto.id }, props: { tree: t, chapter: null, section } }] : [];
};
export const chapterRoutes = async (): Promise<ChapterRoute[]> => {
  const t = await tree();
  return t.chapters.map((chapter) => ({ params: { book: t.dto.id, chapter: chapter.dto.dir }, props: { tree: t, chapter } }));
};
export const json = (data: unknown): Response => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json; charset=utf-8' } });
