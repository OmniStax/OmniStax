/* The release notes as a fragment, for the What's new tab wherever it opens. */
import type { APIRoute } from 'astro';
import { readNotes, whatsNewHtml } from '../lib/content/releases';

export const GET: APIRoute = () =>
  new Response(whatsNewHtml(readNotes()), { headers: { 'content-type': 'text/html; charset=utf-8' } });
