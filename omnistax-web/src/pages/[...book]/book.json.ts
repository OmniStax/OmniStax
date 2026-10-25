/* One book's manifest, beside its pages: what the shell reads when it opens a
   book other than the one the page it is on belongs to. */
import type { APIRoute } from 'astro';
import { bookRoutes, json } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';

export const getStaticPaths = bookRoutes;
export const GET: APIRoute = async ({ props }) => json((props as BookProps).tree.manifest);
