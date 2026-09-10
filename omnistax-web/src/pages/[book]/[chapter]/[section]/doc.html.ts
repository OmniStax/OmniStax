import type { APIRoute } from 'astro';
import { sectionRoutes } from '../../../../lib/content/paths';
import type { SectionRoute } from '../../../../lib/content/paths';
import { fragment } from '../../../../lib/content/fragment';
export const getStaticPaths = sectionRoutes;
export const GET: APIRoute = ({ props }) => {
  const { tree, chapter, section } = props as SectionRoute['props'];
  return new Response(fragment(tree.dto, chapter.dto, section), { headers: { 'content-type': 'text/html; charset=utf-8' } });
};
