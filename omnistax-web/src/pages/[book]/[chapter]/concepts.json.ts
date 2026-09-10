import type { APIRoute } from 'astro';
import { chapterRoutes, json } from '../../../lib/content/paths';
import type { ChapterRoute } from '../../../lib/content/paths';
export const getStaticPaths = chapterRoutes;
export const GET: APIRoute = ({ props }) => json((props as ChapterRoute['props']).chapter.concepts);
