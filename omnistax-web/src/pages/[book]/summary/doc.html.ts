import type { APIRoute } from 'astro';
import { frontRoutes } from '../../../lib/content/paths';
import { docHtml } from '../../../lib/content/endpoints';
export const getStaticPaths = frontRoutes('summary');
export const GET: APIRoute = docHtml;
