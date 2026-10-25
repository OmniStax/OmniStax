/* Which section a URL of the site stands for. The static pages carry ordinary
   links to sections — the about article points at 2.1, a chapter listing points
   at all of its own — and the shell would rather open those as tabs than let
   the browser leave the page. Comparing a path against the manifest is all it
   takes, so it lives here, away from anything that touches the document. */
import { bookId, sectionId, sectionRef, type BookId, type SectionId, type SectionRef } from '../types/ids';
import { DEFAULT_LOCALE, LOCALES } from '../i18n/locale';
import type { BookManifest } from './schema';
import { bookPagesOf } from './roles';

/* Where a book lives: /<book>/, or for a translation /<language>/<source>/, the
   same place in the language it is written in (/zh-CN/college-physics-2e/).
   A translation's id is its source's with the tag lowercased after it
   (college-physics-2e-zh-cn), which the content check holds it to, so the
   address follows from the id alone, here, in the build and in public/sw.js.
   A language the app has no catalog for keeps /<book>/.
   ponytail: tags come from LOCALES; a translation into another language needs
   its locale listed (a catalog may fall back to English) to get the address. */
const TRANSLATED = LOCALES.filter((l) => l !== DEFAULT_LOCALE);
export const bookBase = (id: string): string => {
  const tag = TRANSLATED.find((l) => id.endsWith(`-${l.toLowerCase()}`));
  return tag ? `/${tag}/${id.slice(0, -tag.length - 1)}/` : `/${id}/`;
};
/* The book an address is in and what follows its base, or null for an address
   of no book (/, /download, /zh-CN/). */
export const bookOfPath = (pathname: string): { readonly book: BookId; readonly rest: readonly string[] } | null => {
  const parts = pathname.split('/').filter(Boolean);
  const tag = TRANSLATED.find((l) => l === parts[0]);
  if (tag) return parts[1] ? { book: bookId(`${parts[1]}-${tag.toLowerCase()}`), rest: parts.slice(2) } : null;
  return parts[0] ? { book: bookId(parts[0]), rest: parts.slice(1) } : null;
};

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
  const at = bookOfPath(pathname);
  if (!at || !/^[a-z0-9-]+$/.test(at.book) || at.rest.length < 1 || at.rest.length > 2) return null;
  const [a, b] = at.rest.map((s) => decodeURIComponent(s));
  return b === undefined ? { book: at.book, chapterDir: null, section: sectionId(a) } : { book: at.book, chapterDir: a, section: sectionId(b) };
};
const pathOf = (p: PathRef): string => `${bookBase(p.book)}${p.chapterDir === null ? '' : `${p.chapterDir}/`}${p.section}/`;
/* The page a path names in its book: the manifest's own page at that address
   when it has one, else the section as the path spells it, which the registry
   then finds missing. */
export const resolvePath = (manifest: BookManifest | null, p: PathRef): SectionRef =>
  sectionRef(p.book, (manifest ? sectionOfUrl(manifest, pathOf(p)) : null) ?? p.section);
