/* Where the concept map's nodes stand, settled at build time.

   The layout is a pure function of a node set — the forces are seeded — so it
   is the same every run, and running it in the reader's browser only means
   holding the page still while it runs. So it is run here instead, once per
   scope the reader can stand at: the whole book, and each chapter on its own.
   The file is keyed by the node set rather than by the scope, under the very
   key `forcelayout` computes in the browser, so the map looks its scope up and
   finds it whenever the set it holds is the one the build foresaw.

   A chapter is written twice over, because a chapter-scoped map has whatever
   the reader's registry happens to hold: the chapter alone when only it has
   been fetched, and the whole book behind it once more has been. Both are the
   same few kilobytes and either may be the one asked for. */
import type { APIRoute } from 'astro';
import { bookRoutes, json } from '../../lib/content/paths';
import type { BookProps } from '../../lib/content/paths';
import { bookConceptsOf, chapterConceptsOf } from '../../lib/content/bookdata';
import type { ConceptDTO } from '../../lib/content/schema';
import type { BookTree } from '../../lib/commands/browser';
import { scopedNodes } from '../../lib/sections/dag';
import type { Target } from '../../lib/sections/scope';
import { keyOf, placesFor } from '../../lib/sections/forcelayout';
import { chapterId } from '../../lib/types/ids';
import type { LayoutFileDTO } from '../../lib/sections/layouts';

export const getStaticPaths = bookRoutes;

/* One scope as the build has to try it: the place the view stands, and the
   concepts the reader's registry would hold while it stood there. */
type Scope = { readonly target: Target; readonly all: readonly ConceptDTO[] };

const settledInto = (file: Record<string, Record<string, [number, number]>>, tree: BookTree, { target, all }: Scope): void => {
  const list = scopedNodes(all, target, tree);
  if (!list.length) return;
  const key = keyOf(list);
  if (file[key]) return;
  file[key] = Object.fromEntries([...placesFor(list)].map(([id, p]) => [id, [p.x, p.y] as [number, number]]));
};

export const GET: APIRoute = ({ props }) => {
  const { tree } = props as BookProps;
  const manifest = tree.manifest as BookTree;
  const tables = tree.chapters.map((ch) => ({ dir: ch.dto.dir, concepts: ch.concepts, formulas: ch.formulas }));
  const book = bookConceptsOf(tables);
  /* What a view above the section actually asks for: the chapters with a built
     section in them, which is the set the registry fetches and so the set the
     browser will be holding. A book with nothing left unbuilt makes this the
     same table twice over, and the second is dropped by its own key. */
  const live = new Set(tree.manifest.chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir));
  const reachable = bookConceptsOf(tables.filter((t) => live.has(t.dir)));
  const wholes = [reachable.concepts, book.concepts];
  const scopes: Scope[] = [
    ...wholes.map((all): Scope => ({ target: { level: 'book' }, all })),
    ...tree.chapters.flatMap((ch): Scope[] => {
      const target: Target = { level: 'chapter', chapter: chapterId(ch.dto.id) };
      return [{ target, all: chapterConceptsOf(book, ch.dto.dir).concepts }, ...wholes.map((all): Scope => ({ target, all }))];
    }),
  ];
  const file: Record<string, Record<string, [number, number]>> = {};
  scopes.forEach((s) => settledInto(file, manifest, s));
  return json(file satisfies LayoutFileDTO);
};
