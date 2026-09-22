/* The layouts the build settled, and how the map asks for them.

   Laying a book's concepts out is the one expensive thing the concept map does,
   and it is the same every time: the forces are seeded, so a node set always
   lands in the same places. So the build runs it once per scope and writes the
   answers into layout.json beside the book's other files, and the map fetches
   that file the first time it draws anything. A set the file names is drawn at
   once; a set it does not — a part-loaded book, or a scope the build could not
   foresee — is settled in the worker instead.

   The file is keyed by the node set rather than by the scope, so two scopes that
   draw the same concepts cost one entry, and the key is the one `forcelayout`
   would compute in the browser for the same nodes. */
import { z } from 'zod';
import type { LayoutKey, Positions } from './forcelayout';

/* A place as the file writes it: a pair, since `{x, y}` would double its size. */
const PlaceSchema = z.tuple([z.number(), z.number()]);
export const LayoutFileSchema = z.record(z.record(PlaceSchema));
export type LayoutFileDTO = z.infer<typeof LayoutFileSchema>;

/* Where a book's file stands: beside concepts.json, which the manifest names. */
export const layoutUrlOf = (conceptsUrl: string): string => conceptsUrl.replace(/concepts\.json(\?.*)?$/, 'layout.json$1');

export const positionsOf = (file: LayoutFileDTO, key: LayoutKey): Positions | null => {
  const rows = file[key];
  return rows ? new Map(Object.entries(rows).map(([id, [x, y]]) => [id, { x, y }])) : null;
};

/* The file itself, fetched once per book however many maps ask for it. A book
   whose file will not load is not an error the reader should meet: the maps of
   it simply settle their own layouts, so the failure comes back as an empty
   table rather than a rejection. */
const files = new Map<string, Promise<LayoutFileDTO>>();
export const loadLayouts = (conceptsUrl: string): Promise<LayoutFileDTO> => {
  const url = layoutUrlOf(conceptsUrl);
  const had = files.get(url);
  if (had) return had;
  const run = fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((raw) => LayoutFileSchema.parse(raw))
    .catch((): LayoutFileDTO => ({}));
  files.set(url, run);
  return run;
};
