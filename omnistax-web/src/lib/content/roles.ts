/* A page of the book is one of three things: a section, the introduction a
   chapter or the book opens on, or the summary one closes on (rule 21). The
   three share one record, section.json, and one machinery, and differ in what
   they may carry and where they are listed. On disk an introduction's id is the
   literal "intro" and a summary's "summary", since that is what the folder is
   called; the app reads the page under an id of its own, "2.intro", so that two
   chapters' introductions can stand open in one shell without their documents,
   their DOM ids or their tabs colliding. Everything that tells the roles apart
   is here, pure, so the loader, the validator, the explorer and the tab strip
   all read a page the same way. */
export const PAGE_ROLES = ['section', 'intro', 'summary'] as const;
export type PageRole = (typeof PAGE_ROLES)[number];
/* The two roles whose page is written under a fixed folder name rather than a section number. */
export type FrontRole = Exclude<PageRole, 'section'>;
export const isFrontRole = (s: string): s is FrontRole => s === 'intro' || s === 'summary';

/* The id the app reads a page under: a section's number as it is; an
   introduction or summary qualified by its chapter ("2.intro"), or bare
   ("intro") for the book's own. */
export const pageId = (disk: string, chapter: string | undefined): string =>
  (isFrontRole(disk) && chapter !== undefined ? `${chapter}.${disk}` : disk);
/* What role an app id names, read back off its last part. */
export const pageRoleOf = (id: string): PageRole => {
  const tail = id.slice(id.lastIndexOf('.') + 1);
  return isFrontRole(tail) ? tail : 'section';
};
/* The folder a page is kept in under its chapter or its book: a section's number, or the role's fixed name. */
export const pageDir = (id: string): string => { const role = pageRoleOf(id); return role === 'section' ? id : role; };

/* How a page is named wherever it is listed: a section by its number and title
   ("2.1 Displacement"), an introduction or summary by its title alone, since
   the book prints no number on it. */
export const pageLabel = (page: { readonly id: string; readonly title: string }): string =>
  (pageRoleOf(page.id) === 'section' ? `${page.id} ${page.title}` : page.title);

/* The pages of a chapter, or of a book, in reading order: the introduction
   first, then what the level lists, then the summary. Generic over the shape,
   because the loader's tree, the manifest and the validator's content all lay
   their pages out this way. */
type Framed<T> = { readonly intro?: T; readonly sections?: readonly T[]; readonly summary?: T };
export const pagesOf = <T>(c: Framed<T>): readonly T[] =>
  [...(c.intro ? [c.intro] : []), ...(c.sections ?? []), ...(c.summary ? [c.summary] : [])];
/* Every page of a book in reading order: its own introduction, each chapter's pages, its own summary. */
export const bookPagesOf = <T>(b: { readonly intro?: T; readonly summary?: T; readonly chapters: readonly Framed<T>[] }): readonly T[] =>
  [...(b.intro ? [b.intro] : []), ...b.chapters.flatMap((c) => pagesOf(c)), ...(b.summary ? [b.summary] : [])];

/* The pages either side of one page in a list laid out in reading order: none
   before the first, none after the last. Only pages the list holds are
   neighbours, so a section this build did not make is no link at all. */
export type Neighbours<T> = { readonly prev?: T; readonly next?: T };
export const neighboursOf = <T>(pages: readonly T[], isThis: (page: T) => boolean): Neighbours<T> => {
  const at = pages.findIndex(isThis);
  return at < 0 ? {} : { ...(at > 0 ? { prev: pages[at - 1] } : {}), ...(at < pages.length - 1 ? { next: pages[at + 1] } : {}) };
};
