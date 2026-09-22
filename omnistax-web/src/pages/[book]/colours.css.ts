/* The colour tokens of the book's scheme and the rules that say which classes wear them: one stylesheet every page of the book links. */
import type { APIRoute } from 'astro';
import { bookRoutes } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';
import { NO_CHOICES, cssFor } from '../../lib/colours/model';
import { bookRulesCss } from '../../lib/colours/rules';

export const getStaticPaths = bookRoutes;
export const GET: APIRoute = ({ props }) => {
  const m = (props as BookProps).tree.manifest;
  return new Response(`${cssFor(m, NO_CHOICES)}\n${bookRulesCss(m)}`, { headers: { 'content-type': 'text/css; charset=utf-8' } });
};
