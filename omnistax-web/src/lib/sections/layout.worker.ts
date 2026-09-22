/* The concept map's layout, off the main thread. A scope the build did not
   write positions for — anything the reader's own filtering or a part-loaded
   book leaves behind — is settled here instead, so the page never stops for it.
   The worker holds no state: one message in, one message out, and the ids it
   answers with are the ids it was given. */
import { layout, type Edge, type LayoutKey, type LayoutNode } from './forcelayout';

/* What a layout job carries, and what comes back: plain arrays, since a Map of
   points would only be rebuilt on the other side anyway. */
export type LayoutRequest = { readonly key: LayoutKey; readonly nodes: readonly LayoutNode[]; readonly edges: readonly Edge[] };
export type LayoutReply = { readonly key: LayoutKey; readonly places: readonly (readonly [string, number, number])[]; readonly ms: number };

self.onmessage = (e: MessageEvent<LayoutRequest>) => {
  const { key, nodes, edges } = e.data;
  const t0 = performance.now();
  const pos = layout(nodes, edges);
  const places = [...pos].map(([id, p]) => [id, p.x, p.y] as const);
  const reply: LayoutReply = { key, places, ms: Math.round(performance.now() - t0) };
  (self as unknown as Worker).postMessage(reply);
};
