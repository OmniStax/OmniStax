/* Every chapter's formula sheet of one book, by chapter directory: the search
   reads a foreign book's sheets in one request rather than one per chapter. */
import type { APIRoute } from 'astro';
import { bookRoutes, json } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';
import { bookFormulasOf } from '../../lib/content/bookdata';

export const getStaticPaths = bookRoutes;
export const GET: APIRoute = ({ props }) => json(bookFormulasOf(
  (props as BookProps).tree.chapters.map((ch) => ({ dir: ch.dto.dir, concepts: ch.concepts, formulas: ch.formulas })),
));
