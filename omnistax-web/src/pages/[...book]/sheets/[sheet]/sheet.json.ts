/* One sheet's data, beside its page: what the sheet component fetches and what
   the formula layer resolves an element symbol against. A sheet whose file
   would not read is a build error here, since the page has nothing to draw;
   `npm run check:content` reports the same thing without stopping. */
import type { APIRoute } from 'astro';
import { json, sheetRoutes } from '../../../../lib/content/paths';
import type { SheetProps } from '../../../../lib/content/paths';

export const getStaticPaths = sheetRoutes;
export const GET: APIRoute = async ({ props }) => {
  const { sheet } = props as SheetProps;
  if (sheet.data === null) throw new Error(`the sheet "${sheet.row.id}" names ${sheet.row.file}, which does not read: ${sheet.error ?? 'unknown'}`);
  return json(sheet.data);
};
