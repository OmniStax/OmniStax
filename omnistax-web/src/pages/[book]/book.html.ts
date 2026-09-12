/* The front of one book as a fragment, beside book.json: the same contents
   listing the book's own page carries. */
import type { APIRoute } from 'astro';
import { bookRoutes } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';
import { bookHtml } from '../../lib/content/pages';

export const getStaticPaths = bookRoutes;
export const GET: APIRoute = async ({ props }) =>
  new Response(bookHtml((props as BookProps).tree.manifest), { headers: { 'content-type': 'text/html; charset=utf-8' } });
