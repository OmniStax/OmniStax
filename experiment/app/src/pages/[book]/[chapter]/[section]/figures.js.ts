import type { APIRoute } from 'astro';
import { sectionRoutes } from '../../../../lib/content/paths';
import type { SectionRoute } from '../../../../lib/content/paths';
export const getStaticPaths = sectionRoutes;
export const GET: APIRoute = ({ props }) => new Response((props as SectionRoute['props']).section.figuresJs, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
