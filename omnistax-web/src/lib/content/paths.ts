/* getStaticPaths helpers shared by the page and the endpoints beside it. A
   build carries every book the configuration names, so each helper walks all
   of them and the `book` parameter of every route says which one a page is
   from. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../../omnistax.config';
import type { BookSelection } from '../../../omnistax.config';
import { bookTrees, pageNav } from './load';
import type { BookTree, ChapterTree, SectionSource, SheetSource } from './load';
import type { BookManifest } from './schema';
import { type FrontRole, pageDir, pagesOf } from './roles';
import { bookLocale, fragment } from './fragment';
import { type Edition, type Shell, type ShellRoute, bookPages, bookShells, editionsOf, segment } from './shells';
import { STORED_OUT, STORED_SHELLS, buildPlan } from './stored';

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

/* The books this build makes from their folders: all it carries but those it takes from the store (stored.ts). */
const builtBooks = (): BookSelection => {
  const plan = buildPlan();
  return plan ? { kind: 'named', ids: plan.books.filter((b) => b.stored === null).map((b) => b.id) } : config.content.books;
};
/* Every book this build makes, in the order the configuration puts them in. */
export const trees = (): Promise<readonly BookTree[]> => bookTrees(config.content.root, builtBooks());

/* A stored book as the build reads it back: its manifest and its shells, and the folder its files stand in. */
type StoredBook = { readonly manifest: BookManifest; readonly shells: readonly Shell[]; readonly out: string };
const readStored = async (entry: string, id: string): Promise<StoredBook> => ({
  manifest: JSON.parse(await fs.readFile(path.join(entry, STORED_OUT, segment(id), 'book.json'), 'utf8')) as BookManifest,
  shells: JSON.parse(await fs.readFile(path.join(entry, STORED_SHELLS), 'utf8')) as Shell[],
  out: path.join(entry, STORED_OUT),
});
let storedRead: Promise<ReadonlyMap<string, StoredBook>> | null = null;
const storedBooks = (): Promise<ReadonlyMap<string, StoredBook>> => (storedRead ??= Promise.all((buildPlan()?.books ?? [])
  .flatMap((b) => (b.stored === null ? [] : [readStored(b.stored, b.id).then((s) => [b.id as string, s] as const)]))).then((rows) => new Map(rows)));

/* Every book this build carries, made or stored, in the configuration's order: what the catalogue and the editions of a page read. */
export const manifests = async (): Promise<readonly BookManifest[]> => {
  const made = new Map((await trees()).map((t) => [t.manifest.id as string, t.manifest]));
  const stored = await storedBooks();
  const order = buildPlan()?.books.map((b) => b.id as string) ?? [...made.keys()];
  return order.flatMap((id) => { const m = made.get(id) ?? stored.get(id)?.manifest; return m ? [m] : []; });
};

/* Every page shell of one kind across the books this build carries: a made
   book's from its tree, a stored book's from its records, its text read back
   from the doc.html the store keeps beside them. */
export type ShellProps = { manifest: BookManifest; shell: Shell; pool: string; editions: readonly Edition[] };
export type ShellRouteOf = { params: Readonly<Record<string, string>>; props: ShellProps };
export const shellRoutes = (route: ShellRoute) => async (): Promise<ShellRouteOf[]> => {
  const all = await manifests();
  const editions = (manifest: BookManifest, shell: Shell): readonly Edition[] => (shell.route === 'sheet' ? [] : editionsOf(all, manifest, shell));
  const made = (await trees()).flatMap((tree) => {
    const texts = new Map(bookPages(tree).map(({ chapter, section }) => [section.url, () => fragment(tree.dto, chapter?.dto ?? null, section, pageNav(tree, section), bookLocale(tree.dto))]));
    return bookShells(tree).filter((s) => s.route === route)
      .map((shell) => ({ params: shell.params, props: { manifest: tree.manifest, shell, pool: shell.route === 'sheet' ? shell.pool : texts.get(shell.url)!(), editions: editions(tree.manifest, shell) } }));
  });
  const stored = await Promise.all([...(await storedBooks()).values()].flatMap((b) => b.shells.filter((s) => s.route === route).map(async (shell) => ({
    params: shell.params,
    props: { manifest: b.manifest, shell, pool: shell.route === 'sheet' ? shell.pool : await fs.readFile(path.join(b.out, shell.url, 'doc.html'), 'utf8'), editions: editions(b.manifest, shell) },
  }))));
  return [...made, ...stored];
};

/* One route per book: the book's own page and the files served beside it. */
export const bookRoutes = async (): Promise<BookRoute[]> =>
  (await trees()).map((tree) => ({ params: { book: segment(tree.dto.id) }, props: { tree } }));

/* Every page under a chapter: its sections at their numbers, its introduction and summary at their folder names. */
export const sectionRoutes = async (): Promise<SectionRoute[]> =>
  (await trees()).flatMap((t) => t.chapters.flatMap((chapter) => pagesOf(chapter).map((section) => ({ params: { book: segment(t.dto.id), chapter: chapter.dto.dir, section: pageDir(section.meta.id) }, props: { tree: t, chapter, section } }))));
/* The book's own introduction or summary, where it is built: one route per book that keeps one. */
export const frontRoutes = (role: FrontRole) => async (): Promise<FrontRoute[]> =>
  (await trees()).flatMap((t) => { const section = t[role]; return section ? [{ params: { book: segment(t.dto.id) }, props: { tree: t, chapter: null, section } }] : []; });
export const chapterRoutes = async (): Promise<ChapterRoute[]> =>
  (await trees()).flatMap((t) => t.chapters.map((chapter) => ({ params: { book: segment(t.dto.id), chapter: chapter.dto.dir }, props: { tree: t, chapter } })));
/* Every sheet of every book: the page it is served at, and the data beside it. */
export const sheetRoutes = async (): Promise<SheetRoute[]> =>
  (await trees()).flatMap((tree) => tree.sheets.map((sheet) => ({ params: { book: segment(tree.dto.id), sheet: sheet.row.id }, props: { tree, sheet } })));

export const json = (data: unknown): Response => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json; charset=utf-8' } });
