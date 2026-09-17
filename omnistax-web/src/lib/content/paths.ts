/* getStaticPaths helpers shared by the page and the endpoints beside it. A
   build carries every book the configuration names, so each helper walks all
   of them and the `book` parameter of every route says which one a page is
   from. */
import { config } from '../../../omnistax.config';
import { bookTrees } from './load';
import type { BookTree, ChapterTree, SectionSource, SheetSource } from './load';
import { type FrontRole, pageDir, pagesOf } from './roles';

/* One page of the book as a route: a section or a chapter's own introduction
   or summary, whose chapter is beside it, or one of the book's own pages,
   which belongs to no chapter. */
export type PageProps = { tree: BookTree; chapter: ChapterTree | null; section: SectionSource };
export type BookProps = { tree: BookTree };
export type SectionRoute = { params: { book: string; chapter: string; section: string }; props: PageProps };
export type FrontRoute = { params: { book: string }; props: PageProps };
export type BookRoute = { params: { book: string }; props: BookProps };
export type ChapterRoute = { params: { book: string; chapter: string }; props: { tree: BookTree; chapter: ChapterTree } };
/* One sheet of a book as a route: the book it belongs to and the sheet itself. */
export type SheetProps = { tree: BookTree; sheet: SheetSource };
export type SheetRoute = { params: { book: string; sheet: string }; props: SheetProps };

/* Every book of this build, in the order the configuration puts them in. */
export const trees = (): Promise<readonly BookTree[]> => bookTrees(config.content.root, config.content.books);

/* One route per book: the book's own page and the files served beside it. */
export const bookRoutes = async (): Promise<BookRoute[]> =>
  (await trees()).map((tree) => ({ params: { book: tree.dto.id }, props: { tree } }));

/* Every page under a chapter: its sections at their numbers, its introduction and summary at their folder names. */
export const sectionRoutes = async (): Promise<SectionRoute[]> =>
  (await trees()).flatMap((t) => t.chapters.flatMap((chapter) => pagesOf(chapter).map((section) => ({ params: { book: t.dto.id, chapter: chapter.dto.dir, section: pageDir(section.meta.id) }, props: { tree: t, chapter, section } }))));
/* The book's own introduction or summary, where it is built: one route per book that keeps one. */
export const frontRoutes = (role: FrontRole) => async (): Promise<FrontRoute[]> =>
  (await trees()).flatMap((t) => { const section = t[role]; return section ? [{ params: { book: t.dto.id }, props: { tree: t, chapter: null, section } }] : []; });
export const chapterRoutes = async (): Promise<ChapterRoute[]> =>
  (await trees()).flatMap((t) => t.chapters.map((chapter) => ({ params: { book: t.dto.id, chapter: chapter.dto.dir }, props: { tree: t, chapter } })));
/* Every sheet of every book: the page it is served at, and the data beside it. */
export const sheetRoutes = async (): Promise<SheetRoute[]> =>
  (await trees()).flatMap((tree) => tree.sheets.map((sheet) => ({ params: { book: tree.dto.id, sheet: sheet.row.id }, props: { tree, sheet } })));

export const json = (data: unknown): Response => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json; charset=utf-8' } });
