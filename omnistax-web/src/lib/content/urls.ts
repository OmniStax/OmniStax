/* Which section a URL of the site stands for. The static pages carry ordinary
   links to sections — the about article points at 2.1, a chapter listing points
   at all of its own — and the shell would rather open those as tabs than let
   the browser leave the page. Comparing a path against the manifest is all it
   takes, so it lives here, away from anything that touches the document. */
import { sectionId, type SectionId } from '../types/ids';
import type { BookManifest } from './schema';

/* Paths are compared with one trailing slash, so that `/book/ch02/2.1` and
   `/book/ch02/2.1/` name the same section. */
const norm = (path: string): string => (path.endsWith('/') ? path : `${path}/`);

/* The section a path is the page of, or null when the path belongs to
   something else: another book, a chapter, the front of the site, or a section
   this build did not make a page for. */
export const sectionOfUrl = (manifest: BookManifest, pathname: string): SectionId | null => {
  const want = norm(pathname);
  const hit = manifest.chapters
    .flatMap((c) => c.sections)
    .find((s) => s.built && norm(s.url) === want);
  return hit ? sectionId(hit.id) : null;
};
