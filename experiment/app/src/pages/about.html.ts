/* The front page as a fragment, so the shell can open it as a tab wherever it
   is asked for and not only on the page whose URL it is. */
import type { APIRoute } from 'astro';
import { tree } from '../lib/content/paths';
import { aboutHtml } from '../lib/content/pages';

export const GET: APIRoute = async () =>
  new Response(aboutHtml((await tree()).manifest), { headers: { 'content-type': 'text/html; charset=utf-8' } });
