/* The two endpoints every page of the book serves beside itself: its fragment,
   which the shell fetches to open the page as a tab, and its figure module.
   They are the same for a section and for an introduction or summary page,
   under a chapter or the book's own, so the route files only name their paths. */
import type { APIRoute } from 'astro';
import { bookLocale, fragment } from './fragment';
import { pageNav } from './load';
import type { PageProps } from './paths';

export const docHtml: APIRoute = ({ props }) => {
  const { tree, chapter, section } = props as PageProps;
  return new Response(fragment(tree.dto, chapter?.dto ?? null, section, pageNav(tree, section), bookLocale(tree.dto)), { headers: { 'content-type': 'text/html; charset=utf-8' } });
};

/* A figure script registers under its section's bare number; the build qualifies the key with the book, so two books' scripts never overwrite each other. */
const FIGURES_KEY = /OMNISTAX_FIGURES\[(['"])([^'"]+)\1\]\s*=/g;
export const bookFigures = (book: string, sec: string, js: string): string => {
  const out = js.replace(FIGURES_KEY, (_, q: string, sec: string) => `OMNISTAX_FIGURES[${q}${book}/${sec}${q}] =`);
  if (out === js && /\bfunction\b|=>/.test(js)) throw new Error(`${book}/${sec}/figures.js registers no OMNISTAX_FIGURES['<section>'] key`);
  return out;
};
/* The section's derivations ride in the same module, as data the registry hands to the library (rule 29). */
export const derivationsJs = (book: string, sec: string, rows: readonly unknown[]): string =>
  (rows.length ? `\n(window.OMNISTAX_DERIVATIONS = window.OMNISTAX_DERIVATIONS || {})[${JSON.stringify(`${book}/${sec}`)}] = ${JSON.stringify(rows)};\n` : '');
export const figuresJs: APIRoute = ({ props }) => {
  const { tree, section } = props as PageProps;
  const js = bookFigures(tree.dto.id, section.meta.id, section.figuresJs) + derivationsJs(tree.dto.id, section.meta.id, section.dto.derivations);
  return new Response(js, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
};
