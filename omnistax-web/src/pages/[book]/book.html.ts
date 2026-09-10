/* The front of one book as a fragment, beside book.json: the same contents
   listing the book's own page carries. */
import type { APIRoute } from 'astro';
import { tree } from '../../lib/content/paths';
import { bookHtml } from '../../lib/content/pages';

export const getStaticPaths = async () => [{ params: { book: (await tree()).dto.id } }];
export const GET: APIRoute = async () =>
  new Response(bookHtml((await tree()).manifest), { headers: { 'content-type': 'text/html; charset=utf-8' } });
