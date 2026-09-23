/* The two endpoints every page of the book serves beside itself: its fragment,
   which the shell fetches to open the page as a tab, and its figure module.
   They are the same for a section and for an introduction or summary page,
   under a chapter or the book's own, so the route files only name their paths. */
import type { APIRoute } from 'astro';
import { fragment } from './fragment';
import { pageNav } from './load';
import type { PageProps } from './paths';

export const docHtml: APIRoute = ({ props }) => {
  const { tree, chapter, section } = props as PageProps;
  return new Response(fragment(tree.dto, chapter?.dto ?? null, section, pageNav(tree, section)), { headers: { 'content-type': 'text/html; charset=utf-8' } });
};

/* A figure script registers under its section's bare number; the build qualifies the key with the book, so two books' scripts never overwrite each other. */
const FIGURES_KEY = /OMNISTAX_FIGURES\[(['"])([^'"]+)\1\]\s*=/g;
export const bookFigures = (book: string, sec: string, js: string): string => {
  const out = js.replace(FIGURES_KEY, (_, q: string, sec: string) => `OMNISTAX_FIGURES[${q}${book}/${sec}${q}] =`);
  if (out === js && /\bfunction\b|=>/.test(js)) throw new Error(`${book}/${sec}/figures.js registers no OMNISTAX_FIGURES['<section>'] key`);
  return out;
};
export const figuresJs: APIRoute = ({ props }) => {
  const { tree, section } = props as PageProps;
  return new Response(bookFigures(tree.dto.id, section.meta.id, section.figuresJs), { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
};
