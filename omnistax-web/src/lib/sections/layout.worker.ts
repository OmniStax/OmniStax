/* The concept map's layout, off the main thread. The worker holds no state: one
   message in, one message out, and the ids it answers with are the ids it was given. */
import { laidOut, type LayoutKey, type MapKind } from './layouts';
import type { Edge, LayoutNode } from './sugiyama';

export type LayoutRequest = { readonly key: LayoutKey; readonly kind: MapKind; readonly nodes: readonly LayoutNode[]; readonly edges: readonly Edge[] };
/* Plain arrays both ways: a Map would only be rebuilt on the other side. */
export type LayoutReply = {
  readonly key: LayoutKey; readonly ms: number;
  readonly places: readonly (readonly [string, number, number])[];
  readonly bends: readonly (readonly [string, readonly number[]])[];
  readonly tree?: readonly string[];
  readonly steps?: readonly (readonly [string, string, number, number])[];
};

self.onmessage = (e: MessageEvent<LayoutRequest>) => {
  const { key, kind, nodes, edges } = e.data;
  const t0 = performance.now();
  const laid = laidOut(kind, nodes, edges);
  const reply: LayoutReply = {
    key, ms: Math.round(performance.now() - t0),
    places: [...laid.pos].map(([id, p]) => [id, p.x, p.y] as const),
    bends: [...laid.bends].map(([k, ps]) => [k, ps.flatMap((p) => [p.x, p.y])] as const),
    tree: laid.tree ? [...laid.tree] : undefined,
    steps: laid.steps ? [...laid.steps].map(([id, [p, x, y]]) => [id, p, x, y] as const) : undefined,
  };
  (self as unknown as Worker).postMessage(reply);
};
