/* The editions of a book: a source and the translations of it (book.json
   `translation_of`), which keep every id of the source (the content check's
   parity rule), so the same section opens in either. Pure: the library's
   catalogue and a book's manifest in, ids out. The live half, which opens the
   other edition where the reader stands, is editions.svelte.ts. */
import { bookPagesOf } from '../content/roles';

/* What an edition is to these functions: the fields of a catalogue entry (LibraryBookDTO) they read. */
export type Edition = { readonly id: string; readonly language: string; readonly translationOf?: string };

/* The book the edition is an edition of: the source a translation names, where
   the catalogue carries it, else the book itself. A translation of a
   translation is followed back to the first book, and a loop stops where it
   closes. */
export const rootOf = <T extends Edition>(books: readonly T[], id: string): string => {
  const seen = new Set<string>();
  let at = id;
  for (;;) {
    seen.add(at);
    const of = books.find((b) => b.id === at)?.translationOf;
    if (of === undefined || seen.has(of) || !books.some((b) => b.id === of)) return at;
    at = of;
  }
};

/* Every edition of the book, the source first and the rest in catalogue order;
   the book alone where it has no other, and nothing where the catalogue does not
   carry it. A translation whose source is not in the build is an edition of its
   own. */
export const editionsOf = <T extends Edition>(books: readonly T[], id: string): readonly T[] => {
  if (!books.some((b) => b.id === id)) return [];
  const root = rootOf(books, id);
  const first = books.find((b) => b.id === root);
  return [...(first ? [first] : []), ...books.filter((b) => b.id !== root && rootOf(books, b.id) === root)];
};

/* The edition of the book written in the given language, the book itself where that is its own. */
export const siblingIn = <T extends Edition>(books: readonly T[], id: string, language: string): T | undefined => {
  const all = editionsOf(books, id);
  return all.find((b) => b.id === id && b.language === language) ?? all.find((b) => b.language === language);
};

/* The editions other than this one, which is what a menu offers to switch to. */
export const otherEditions = <T extends Edition>(books: readonly T[], id: string): readonly T[] =>
  editionsOf(books, id).filter((b) => b.id !== id);

/* The catalogue as the finder lists it: one row per source, each with its other editions beneath it. */
export type EditionGroup<T> = { readonly root: T; readonly others: readonly T[] };
export const editionGroups = <T extends Edition>(books: readonly T[]): readonly EditionGroup<T>[] =>
  books.filter((b) => rootOf(books, b.id) === b.id).map((root) => ({ root, others: otherEditions(books, root.id) }));

/* A language's name as the reader's own language writes it ("Chinese (China)",
   "中文（中国）"), else the tag itself where the runtime has no name for it. */
export const languageName = (tag: string, uiLocale: string): string => {
  try { return new Intl.DisplayNames([uiLocale], { type: 'language' }).of(tag) ?? tag; } catch { return tag; }
};

/* The page of the other edition that the reader lands on: the same page where
   that edition builds it, since the ids are the same, else its first built
   page, else nothing. */
type Page = { readonly id: string; readonly built: boolean };
type PagedBook = { readonly intro?: Page; readonly summary?: Page; readonly chapters: readonly { readonly intro?: Page; readonly sections?: readonly Page[]; readonly summary?: Page }[] };
export const editionPage = (manifest: PagedBook, page: string | null): string | null => {
  const pages = bookPagesOf(manifest);
  return (page !== null && pages.find((p) => p.id === page && p.built)?.id) || (pages.find((p) => p.built)?.id ?? null);
};
