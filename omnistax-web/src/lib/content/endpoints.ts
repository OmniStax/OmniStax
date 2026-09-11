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
export const figuresJs: APIRoute = ({ props }) => new Response((props as PageProps).section.figuresJs, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
