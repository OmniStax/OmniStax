/* The catalogue the explorer's "Find a textbook" floater reads: one entry for
   every book this build knows. Today that is the single configured book, but
   the shape is a list so that a second one costs nothing. */
import type { APIRoute } from 'astro';
import { tree, json } from '../lib/content/paths';
import type { BookManifest } from '../lib/content/schema';
import type { LibraryBookDTO } from '../lib/explorer/library.svelte';

const entry = (m: BookManifest): LibraryBookDTO => ({
  id: m.id, title: m.title, publisher: m.publisher, authors: [...m.authors],
  chapters: m.chapters.length,
  sections: m.chapters.reduce((n, c) => n + c.sections.length, 0),
  url: `/${m.id}/`,
});

export const GET: APIRoute = async () => json([entry((await tree()).manifest)]);
