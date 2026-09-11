import type { APIRoute } from 'astro';
import { problemSetRoutes, json } from '../../../../lib/content/paths';
import type { SectionRoute } from '../../../../lib/content/paths';
/* The problem set on its own, for a practice session that draws on a book other than the one being read. */
export const getStaticPaths = problemSetRoutes;
export const GET: APIRoute = ({ props }) => json((props as SectionRoute['props']).section.exercises);
