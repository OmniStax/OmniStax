/* Concept map layout: which nodes to show at the level a view stands at, and rows
   by prerequisite depth. A section or a chapter shows what it teaches and, dashed
   behind it, the concepts it takes for granted; the book shows everything it
   teaches, with the sections it has not built yet dashed in the same way. */
import type { ConceptDTO } from '../content/schema';
import { sectionsOf, type Target } from './scope';
import type { BookTree } from '../commands/browser';
export type DagNode = ConceptDTO & { readonly ext: boolean };

export const scopedNodes = (all: readonly ConceptDTO[], target: Target, tree: BookTree): DagNode[] => {
  if (target.level === 'book') return all.map((c) => ({ ...c, ext: c.status === 'placeholder' }));
  const scope = new Set<string>(sectionsOf(target, tree));
  const own = all.filter((c) => scope.has(c.section) && c.status === 'built');
  const ids = new Set(own.map((c) => c.id));
  const ext = own.flatMap((c) => c.prereqs).filter((p, i, arr) => !ids.has(p) && arr.indexOf(p) === i).map((p) => all.find((c) => c.id === p)).filter((c): c is ConceptDTO => !!c);
  return [...ext.map((c) => ({ ...c, ext: true })), ...own.map((c) => ({ ...c, ext: false }))];
};
/* Other-section nodes first, then each node one row below its deepest prerequisite. */
export const dagRows = (list: readonly DagNode[]): string[][] => {
  const ext = list.filter((c) => c.ext).map((c) => c.id), own = list.filter((c) => !c.ext);
  const depth = new Map<string, number>();
  const d = (c: DagNode): number => {
    const known = depth.get(c.id); if (known !== undefined) return known;
    const v = 1 + Math.max(0, ...c.prereqs.map((p) => { const q = own.find((r) => r.id === p); return q ? d(q) : 0; }));
    depth.set(c.id, v); return v;
  };
  const byDepth = new Map<number, string[]>();
  own.forEach((c) => { const k = d(c); byDepth.set(k, [...(byDepth.get(k) ?? []), c.id]); });
  return [ext, ...[...byDepth.keys()].sort((a, b) => a - b).map((k) => byDepth.get(k)!)].filter((r) => r.length);
};
export const edgesOf = (list: readonly DagNode[]): Array<[string, string]> => {
  const ids = new Set(list.map((c) => c.id));
  return list.flatMap((c) => c.prereqs.filter((p) => ids.has(p)).map((p): [string, string] => [p, c.id]));
};
