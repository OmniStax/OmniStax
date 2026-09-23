/* Which section a URL of the site stands for. The static pages carry ordinary
   links to sections — the about article points at 2.1, a chapter listing points
   at all of its own — and the shell would rather open those as tabs than let
   the browser leave the page. Comparing a path against the manifest is all it
   takes, so it lives here, away from anything that touches the document. */
import { bookId, sectionId, sectionRef, type BookId, type SectionId, type SectionRef } from '../types/ids';
import type { BookManifest } from './schema';
import { bookPagesOf } from './roles';

/* Paths are compared with one trailing slash, so that `/book/ch02/2.1` and
   `/book/ch02/2.1/` name the same section. */
const norm = (path: string): string => (path.endsWith('/') ? path : `${path}/`);

/* The page a path is the address of — a section, or an introduction or summary
   of a chapter or of the book — or null when the path belongs to something
   else: another book, a chapter, the front of the site, or a section this
   build did not make a page for. */
export const sectionOfUrl = (manifest: BookManifest, pathname: string): SectionId | null => {
  const want = norm(pathname);
  const hit = bookPagesOf(manifest).find((s) => s.built && norm(s.url) === want);
  return hit ? sectionId(hit.id) : null;
};


/* What an address of a book's page says on its face, before any manifest is
   read: `/<book>/<chapter>/<section>/`, or `/<book>/<page>/` for the book's
   own. The section is the folder's name, which for an introduction or summary
   is not yet the id the app reads it by. */
export type PathRef = { readonly book: BookId; readonly chapterDir: string | null; readonly section: SectionId };
export const refOfPath = (pathname: string): PathRef | null => {
  const m = /^\/([a-z0-9-]+)\/(?:([^/]+)\/)?([^/]+)\/?$/.exec(pathname);
  return m ? { book: bookId(m[1]), chapterDir: m[2] === undefined ? null : decodeURIComponent(m[2]), section: sectionId(decodeURIComponent(m[3])) } : null;
};
const pathOf = (p: PathRef): string => (p.chapterDir === null ? `/${p.book}/${p.section}/` : `/${p.book}/${p.chapterDir}/${p.section}/`);
/* The page a path names in its book: the manifest's own page at that address
   when it has one, else the section as the path spells it, which the registry
   then finds missing. */
export const resolvePath = (manifest: BookManifest | null, p: PathRef): SectionRef =>
  sectionRef(p.book, (manifest ? sectionOfUrl(manifest, pathOf(p)) : null) ?? p.section);
