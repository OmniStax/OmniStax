import type { APIRoute } from 'astro';
import { frontRoutes } from '../../../lib/content/paths';
import { figuresJs } from '../../../lib/content/endpoints';
export const getStaticPaths = frontRoutes('intro');
export const GET: APIRoute = figuresJs;
