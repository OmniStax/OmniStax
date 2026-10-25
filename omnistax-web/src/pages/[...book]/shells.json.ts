/* The records a book's page shells are rendered from (shells.ts). The build
   moves this file into the store rather than serving it (content.mjs). */
import type { APIRoute } from 'astro';
import { bookRoutes, json } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';
import { bookShells } from '../../lib/content/shells';

export const getStaticPaths = bookRoutes;
export const GET: APIRoute = async ({ props }) => json(bookShells((props as BookProps).tree));
