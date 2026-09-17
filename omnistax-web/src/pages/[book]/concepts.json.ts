/* Every concept of one book once, and per chapter the ids it reaches and the
   coverage of its own sections, so a chapter's own file can be rebuilt from it
   (`chapterConceptsOf`). A chapter reaches into the chapters before it, so the
   per-chapter files repeat most of their rows; this one does not. */
import type { APIRoute } from 'astro';
import { bookRoutes, json } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';
import { bookConceptsOf } from '../../lib/content/bookdata';

export const getStaticPaths = bookRoutes;
export const GET: APIRoute = ({ props }) => json(bookConceptsOf(
  (props as BookProps).tree.chapters.map((ch) => ({ dir: ch.dto.dir, concepts: ch.concepts, formulas: ch.formulas })),
));
