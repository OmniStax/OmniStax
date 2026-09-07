/* Concept map layout: which nodes to show for a scope, and rows by prerequisite depth. */
import type { ConceptDTO } from '../content/schema';
export type DagNode = ConceptDTO & { readonly ext: boolean };

export const scopedNodes = (all: readonly ConceptDTO[], scope: string | null): DagNode[] => {
  if (!scope) return all.map((c) => ({ ...c, ext: c.placeholder }));
  const own = all.filter((c) => c.section === scope && !c.placeholder);
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
