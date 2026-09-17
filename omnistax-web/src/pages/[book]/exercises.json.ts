/* Every built section's problem set of one book, in one file: what a practice
   session over the whole library reads instead of one exercises.json per page.
   The per-section files stay beside their pages for the one section a reader
   has open. */
import type { APIRoute } from 'astro';
import { bookRoutes, json } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';
import { bookExercisesOf } from '../../lib/content/bookdata';

export const getStaticPaths = bookRoutes;
export const GET: APIRoute = ({ props }) => json(bookExercisesOf(
  (props as BookProps).tree.chapters.flatMap((ch) => ch.sections.filter((s) => s.role === 'section').map((s) => ({ id: s.meta.id, exercises: s.exercises }))),
));
