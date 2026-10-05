/* The concept map's layouts, and what the build and the browser agree on.

   Three layouts: Sugiyama top-down (`down`, the default), the same turned to
   run left to right (`right`), and the hyperbolic tree in the Poincaré disk
   (`disk`). Each is a pure function of a node set, so a set is named by the hash
   of its ids plus the kind, and a layout computed once is kept for the session.

   The build settles the default for every scope the reader can stand at and
   writes it into layout.json beside concepts.json, so the first paint needs no
   layout at all; the map fetches that file the first time it draws. Anything the
   file does not hold — the other two kinds, a focus, a scope the build could not
   foresee — is laid out in the worker, or on the main thread when small. */
import { z } from 'zod';
import type { DagNode } from './dag';
import { sugiyama, transposed, wireOf, edgeKey, type Box, type Edge, type Laid, type LayoutNode, type Pt } from './sugiyama';
import { hyperTree } from './hyperbolic';

export type MapKind = 'down' | 'right' | 'disk';
export const MAP_KINDS: readonly MapKind[] = ['down', 'right', 'disk'];

export const laidOut = (kind: MapKind, nodes: readonly LayoutNode[], edges: readonly Edge[]): Laid =>
  kind === 'down' ? sugiyama(nodes, edges)
  : kind === 'right' ? transposed(sugiyama(nodes.map((n) => ({ id: n.id, w: n.h, h: n.w })), edges))
  : hyperTree(nodes.map((n) => n.id), edges);

/* The path of every edge of a layered layout, computed once per layout. */
export const wiresOf = (laid: Laid, edges: readonly Edge[], size: (id: string) => Box, kind: MapKind): Map<string, string> =>
  new Map(edges.flatMap(([a, b]): [string, string][] => {
    const p = laid.pos.get(a), q = laid.pos.get(b), k = edgeKey(a, b);
    return p && q ? [[k, wireOf(p, size(a), q, size(b), laid.bends.get(k) ?? [], kind === 'right')]] : [];
  }));

/* ---------- the box a node is kept, read off its name ----------

   The build has no document to measure in, so the name is set the way the
   browser will set it — word by word into lines no wider than the widest node,
   each glyph as wide as the widest of the bundled faces makes it, an inline
   formula as one piece that breaks only at its equals signs — and the box is
   that with the node's padding round it. The browser measures its own. */
export const NODE_FONT = 12, NODE_LINE = 15;
export const MAXW = 172, MINW = 48, PAD_X = 20, PAD_Y = 16, SEC_LINE = 12;
const SPACE = 0.3;
const glyph = (ch: string): number =>
  /[ijl.,:;'`!|]/.test(ch) ? 0.3
  : /[ftrI()[\]/\-]/.test(ch) ? 0.4
  : /[mwMW]/.test(ch) ? 0.9
  : /[A-Z]/.test(ch) ? 0.72
  : /[0-9a-z]/.test(ch) ? 0.58
  : 0.65;
const runOf = (s: string): number => [...s].reduce((sum, ch) => sum + (ch === ' ' ? SPACE : glyph(ch)), 0);
const MATH = 1.2;
const mathRun = (tex: string): number => {
  const flat = tex
    .replace(/\\(?:t|d)?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a: string, b: string) => (a.length > b.length ? a : b))
    .replace(/\\(?:text|mathrm|mathit|operatorname)\{([^{}]*)\}/g, '$1')
    .replace(/\\k[A-Za-z]+/g, 'XXq')
    .replace(/\\(?:Delta|times|cdot|theta|alpha|beta|gamma|omega|lambda|mu|pi|rho|sigma|tau|phi|kappa|epsilon|varepsilon|nu|eta)\b/g, 'X')
    .replace(/\\[;,:! ]|~/g, ' ')
    .replace(/\\[A-Za-z]+/g, 'x')
    .replace(/[{}]/g, '');
  const scripts = (flat.match(/[\^_]/g) ?? []).length;
  const ops = (flat.match(/[=+<>]|(?<=\S)\s*-\s*(?=\S)/g) ?? []).length;
  return (runOf(flat.replace(/[\^_\s]/g, '')) - scripts * 0.15 + ops * 0.6) * MATH;
};
type Piece = { readonly em: number; readonly tall: number };
const piecesOf = (name: string): Piece[] =>
  name.split(/(\$[^$]*\$)/).filter(Boolean).flatMap((part): Piece[] => {
    if (!part.startsWith('$')) return part.split(/\s+/).filter(Boolean).map((w) => ({ em: runOf(w), tall: 0 }));
    const tex = part.slice(1, -1);
    const tall = /\\d?frac/.test(tex) ? 16 : /\\tfrac|\^/.test(tex) ? 9 : 6;
    return tex.split(/(?<==)/).map((t) => ({ em: mathRun(t), tall }));
  });
const linesOf = (pieces: readonly Piece[], max: number): { readonly w: number; readonly heights: readonly number[] } => {
  const lines = pieces.reduce<{ w: number; tall: number }[]>((acc, p) => {
    const last = acc[acc.length - 1], wide = p.em * NODE_FONT;
    if (last && last.w + SPACE * NODE_FONT + wide <= max) return [...acc.slice(0, -1), { w: last.w + SPACE * NODE_FONT + wide, tall: Math.max(last.tall, p.tall) }];
    return [...acc, { w: wide, tall: p.tall }];
  }, []);
  return { w: Math.max(0, ...lines.map((l) => Math.min(l.w, max))), heights: lines.map((l) => NODE_LINE + l.tall + Math.max(0, Math.ceil(l.w / max) - 1) * NODE_LINE) };
};
const HEAVY = 1.06;
export const boxOf = (c: { readonly name: string; readonly ext: boolean; readonly kind?: string }): Box => {
  const heavy = c.kind === 'axiom' || c.kind === 'result' ? HEAVY : 1;
  const skill = c.kind === 'skill' ? 1.2 : 0;
  const pieces = [...(skill ? [{ em: skill, tall: 0 }] : []), ...piecesOf(c.name).map((p) => ({ ...p, em: p.em * heavy }))];
  const { w, heights } = linesOf(pieces, MAXW - PAD_X);
  return { w: Math.ceil(Math.max(MINW, w + PAD_X)), h: Math.ceil(PAD_Y + Math.max(NODE_LINE, heights.reduce((a, b) => a + b, 0)) + (c.ext ? SEC_LINE : 0)) };
};

/* ---------- names ---------- */

/* A node set's name: its ids, sorted, hashed to a short string. */
export type LayoutKey = string;
export const hashOf = (ids: readonly string[]): string => {
  let h = 2166136261;
  for (const s of [...ids].sort().join('\u0000')) { h ^= s.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};
export const keyOf = (list: readonly DagNode[], kind: MapKind): LayoutKey => `${hashOf(list.map((c) => c.id))}:${kind}`;

/* The extent a layered layout covers, with room round the outermost node. */
export const extentOf = (pos: ReadonlyMap<string, Pt>, pad = 120): { x: number; y: number; w: number; h: number } => {
  const pts = [...pos.values()];
  if (!pts.length) return { x: -pad, y: -pad, w: pad * 2, h: pad * 2 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
};

/* ---------- the build's file ---------- */

/* A place as a pair, and an edge's bends flattened to x, y, x, y: `{x, y}` would double the file. */
const PlaceSchema = z.tuple([z.number(), z.number()]);
const LaidSchema = z.object({ at: z.record(PlaceSchema), bends: z.record(z.array(z.number())) });
export const LayoutFileSchema = z.record(LaidSchema);
export type LayoutFileDTO = z.infer<typeof LayoutFileSchema>;

export const fileEntryOf = (laid: Laid): LayoutFileDTO[string] => ({
  at: Object.fromEntries([...laid.pos].map(([id, p]) => [id, [p.x, p.y]])),
  bends: Object.fromEntries([...laid.bends].map(([k, ps]) => [k, ps.flatMap((p) => [p.x, p.y])])),
});
export const laidOf = (file: LayoutFileDTO, key: LayoutKey): Laid | null => {
  const e = file[key];
  return e ? {
    pos: new Map(Object.entries(e.at).map(([id, [x, y]]) => [id, { x, y }])),
    bends: new Map(Object.entries(e.bends).map(([k, xs]) => [k, Array.from({ length: xs.length / 2 }, (_, i) => ({ x: xs[2 * i], y: xs[2 * i + 1] }))])),
  } : null;
};

export const layoutUrlOf = (conceptsUrl: string): string => conceptsUrl.replace(/concepts\.json(\?.*)?$/, 'layout.json$1');

/* Fetched once per book. A file that will not load is an empty table: the map
   then lays its scopes out itself. */
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

/* Every layout this session has settled, by key. */
export const sessionLayouts = new Map<LayoutKey, { readonly laid: Laid; readonly ms: number; readonly source: 'build' | 'worker' | 'here' }>();
