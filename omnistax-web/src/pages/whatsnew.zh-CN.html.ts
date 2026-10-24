/* The same fragment in Chinese: a note's Chinese sibling where it has one, else the English note. */
import type { APIRoute } from 'astro';
import { readNotes, whatsNewHtml } from '../lib/content/releases';

export const GET: APIRoute = () =>
  new Response(whatsNewHtml(readNotes(), 'zh-CN'), { headers: { 'content-type': 'text/html; charset=utf-8' } });
