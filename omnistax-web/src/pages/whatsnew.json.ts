/* The notes by version and title, newest first: what the app reads as it starts. */
import type { APIRoute } from 'astro';
import { readNotes } from '../lib/content/releases';

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ notes: readNotes().map(({ version, title }) => ({ version, title })) }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
