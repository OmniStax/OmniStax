import type { APIRoute } from 'astro';
import { sectionRoutes } from '../../../../lib/content/paths';
import { docHtml } from '../../../../lib/content/endpoints';
export const getStaticPaths = sectionRoutes;
export const GET: APIRoute = docHtml;
