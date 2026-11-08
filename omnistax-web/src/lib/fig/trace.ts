/* The trace engine behind a debugger figure (docs/design-code-and-debugger.md §2.2, §2.3). Pure: no DOM.

   A trace is a list of frames, each meaning "line L finished; these are the variables now". A figure writes
   its own with `F.trace((at) => …)` from a JS copy of the shown code; the code runner (slice 2) gives the same
   frames for the reader's code. The shown code is cut into blocks by line range, nested by containment, and
   the reader steps from block end to block end at a level of that nesting:

   - an instance of a block is a maximal run of frames whose line is in its range, or which is deeper than the
     run's start (a call made inside it); a return to the block's first line at the run's depth starts a new
     instance, so each loop iteration is one;
   - stops(L) are the ends of the instances of every block at depth ≤ L, with the first and the last frame;
   - the cursor is (stop p, level ℓ): step to the next stop at ℓ, back to the previous one, step into ℓ + 1
     (the next stop there, the end of the first child), step out to ℓ − 1 (the end of the enclosing instance). */

export type Value = number | string | boolean | null | readonly Value[] | { readonly [k: string]: Value };
export type Frame = {
  readonly line: number;
  readonly vars: Readonly<Record<string, Value>>;
  readonly ev?: readonly [string, ...Value[]];
  readonly depth: number;
  readonly fn?: string;
};
export type BlockSpec = { readonly id: string; readonly lines: readonly [number, number]; readonly label?: string; readonly touches?: readonly string[] };
export type Block = BlockSpec & { readonly depth: number; readonly parent: number | null; readonly children: readonly number[]; readonly index: number };
export type Tree = { readonly blocks: readonly Block[]; readonly roots: readonly number[]; readonly levels: number; readonly errors: readonly string[] };
export type Instance = { readonly block: number; readonly start: number; readonly end: number; readonly depth: number };

/* ---------- caps (§2.2): lists of 64, three levels deep, 5,000 frames ---------- */
export const CAP_ITEMS = 64, CAP_DEPTH = 3, CAP_FRAMES = 5000;
const ELIDED = '…';
/* a snapshot of a value, so later mutation of the traced arrays never reaches a recorded frame */
export function capture(v: unknown, depth = 0): Value {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'bigint') return Number(v);
  if (depth >= CAP_DEPTH) return ELIDED;
  if (v instanceof Set) v = [...v];
  if (v instanceof Map) v = Object.fromEntries(v);
  if (Array.isArray(v) || ArrayBuffer.isView(v)) {
    const a = Array.from(v as ArrayLike<unknown>);
    const out = a.slice(0, CAP_ITEMS).map((x) => capture(x, depth + 1));
    if (a.length > CAP_ITEMS) out.push(ELIDED);
    return out;
  }
  if (typeof v === 'object') {
    const out: Record<string, Value> = {};
    Object.entries(v as object).slice(0, CAP_ITEMS).forEach(([k, x]) => { out[k] = capture(x, depth + 1); });
    return out;
  }
  return String(v);
}

export type At = {
  (line: number, vars?: Record<string, unknown>, ev?: readonly [string, ...unknown[]]): void;
  /* a call: frames recorded until the matching leave are one deeper */
  enter: (fn?: string) => void;
  leave: () => void;
  readonly depth: number;
};
/* `F.trace((at) => { …; at(5, { i, j, s }, ['compare', i, j]); … })`: the frames the body records, snapshotted
   and capped; a body that records more than 5,000 stops there (the result's `truncated` says so). */
export function record(body: (at: At) => void): Frame[] & { truncated?: boolean } {
  const frames: Frame[] & { truncated?: boolean } = [];
  const fns: (string | undefined)[] = [];
  let depth = 0;
  const STOP = {};
  const at = ((line: number, vars: Record<string, unknown> = {}, ev?: readonly [string, ...unknown[]]) => {
    if (frames.length >= CAP_FRAMES) { frames.truncated = true; throw STOP; }
    const v: Record<string, Value> = {};
    Object.entries(vars).forEach(([k, x]) => { v[k] = capture(x); });
    const fn = fns[fns.length - 1];
    frames.push({ line, vars: v, depth, ...(ev ? { ev: [ev[0], ...ev.slice(1).map((x) => capture(x))] as const } : {}), ...(fn ? { fn } : {}) });
  }) as At;
  Object.defineProperties(at, {
    enter: { value: (fn?: string) => { depth += 1; fns.push(fn); } },
    leave: { value: () => { depth = Math.max(0, depth - 1); fns.pop(); } },
    depth: { get: () => depth },
  });
  try { body(at); } catch (e) { if (e !== STOP) throw e; }
  return frames;
}

/* ---------- blocks: nesting by line containment ---------- */
const inside = (a: readonly [number, number], b: readonly [number, number]): boolean => b[0] <= a[0] && a[1] <= b[1];
/* The containment tree. A block's parent is the smallest block holding its range; two ranges that overlap
   without one holding the other, or two equal ranges, are errors (the figure logs them) and the later one is
   dropped from the tree. */
export function tree(specs: readonly BlockSpec[]): Tree {
  const errors: string[] = [];
  const kept: BlockSpec[] = [];
  specs.forEach((b) => {
    const [a, z] = b.lines;
    if (!(a >= 1 && z >= a)) { errors.push(`block "${b.id}": lines [${a}, ${z}] are not a range`); return; }
    const clash = kept.find((k) => {
      const same = k.lines[0] === a && k.lines[1] === z;
      const overlap = k.lines[0] <= z && a <= k.lines[1];
      return same || (overlap && !inside(b.lines, k.lines) && !inside(k.lines, b.lines));
    });
    if (clash) { errors.push(`block "${b.id}" [${a}, ${z}] overlaps block "${clash.id}" [${clash.lines[0]}, ${clash.lines[1]}] without nesting`); return; }
    kept.push(b);
  });
  const span = (b: BlockSpec): number => b.lines[1] - b.lines[0];
  const parentOf = (i: number): number | null => {
    let best: number | null = null;
    kept.forEach((k, j) => {
      if (j === i || !inside(kept[i].lines, k.lines)) return;
      if (best === null || span(k) < span(kept[best])) best = j;
    });
    return best;
  };
  const parents = kept.map((_, i) => parentOf(i));
  const depthOf = (i: number): number => { let d = 0; for (let p = parents[i]; p !== null; p = parents[p]) d += 1; return d; };
  const blocks: Block[] = kept.map((b, i) => ({
    ...b, index: i, parent: parents[i], depth: depthOf(i),
    children: kept.map((_, j) => j).filter((j) => parents[j] === i).sort((x, y) => kept[x].lines[0] - kept[y].lines[0]),
  }));
  const roots = blocks.filter((b) => b.parent === null).map((b) => b.index).sort((x, y) => blocks[x].lines[0] - blocks[y].lines[0]);
  return { blocks, roots, levels: blocks.length ? Math.max(...blocks.map((b) => b.depth)) + 1 : 1, errors };
}
export const byId = (t: Tree, id: string): Block | undefined => t.blocks.find((b) => b.id === id);
export const ancestors = (t: Tree, i: number): Block[] => { const out: Block[] = []; for (let p = t.blocks[i].parent; p !== null; p = t.blocks[p].parent) out.push(t.blocks[p]); return out; };

/* ---------- instances ---------- */
export function instancesOf(frames: readonly Frame[], b: Block): Instance[] {
  const [lo, hi] = b.lines, out: Instance[] = [];
  const inRange = (f: Frame): boolean => f.line >= lo && f.line <= hi;
  let run: { start: number; end: number; depth: number } | null = null, floor = 0;
  /* the frames of calls made on the instance's first line come before that line's own frame */
  const back = (i: number, d: number): number => { let s = i; while (s - 1 >= floor && frames[s - 1].depth > d) s -= 1; return s; };
  const close = (): void => { if (run) { out.push({ block: b.index, start: run.start, end: run.end, depth: run.depth }); floor = run.end + 1; run = null; } };
  frames.forEach((f, i) => {
    if (run && f.depth > run.depth) return;                         /* inside a call made from the run */
    if (run && f.depth === run.depth && inRange(f)) {
      if (f.line === lo) { const s = back(i, f.depth); close(); run = { start: s, end: i, depth: f.depth }; return; }
      run.end = i; return;
    }
    close();
    if (inRange(f)) { const s = back(i, f.depth); run = { start: s, end: i, depth: f.depth }; }
  });
  close();
  return out;
}
export const instances = (frames: readonly Frame[], t: Tree): Instance[] =>
  t.blocks.flatMap((b) => instancesOf(frames, b)).sort((x, y) => x.end - y.end || t.blocks[y.block].depth - t.blocks[x.block].depth);

/* ---------- a trace laid over its blocks ---------- */
export type Laid = {
  readonly frames: readonly Frame[]; readonly tree: Tree; readonly instances: readonly Instance[];
  readonly stops: readonly (readonly number[])[];   /* per level, frame indices, ascending */
};
export function lay(frames: readonly Frame[], t: Tree): Laid {
  const ins = instances(frames, t), n = frames.length;
  const stops = Array.from({ length: t.levels }, (_, L) => {
    const s = new Set<number>();
    if (n) { s.add(0); s.add(n - 1); }
    ins.forEach((x) => { if (t.blocks[x.block].depth <= L) s.add(x.end); });
    return [...s].sort((a, b) => a - b);
  });
  return { frames, tree: t, instances: ins, stops };
}
export const stopsAt = (l: Laid, level: number): readonly number[] => l.stops[Math.max(0, Math.min(l.stops.length - 1, level))] ?? [];

/* the block a stop shows at a level: the deepest block at depth ≤ level whose instance ends there */
export function blockAt(l: Laid, p: number, level: number): Block | null {
  let best: Block | null = null;
  l.instances.forEach((x) => {
    const b = l.tree.blocks[x.block];
    if (x.end === p && b.depth <= level && (!best || b.depth > best.depth)) best = b;
  });
  return best;
}
/* what the step to p touches: the block's own touches and its ancestors' */
export function touchedAt(l: Laid, b: Block | null): ReadonlySet<string> {
  if (!b) return new Set();
  return new Set([b, ...ancestors(l.tree, b.index)].flatMap((x) => x.touches ?? []));
}
/* the lines run by the step from stop a to stop b: frames a+1 … b (just b's own when a ≥ b) */
export function executed(l: Laid, a: number, b: number): ReadonlySet<number> {
  const s = new Set<number>();
  for (let i = Math.min(a + 1, b); i <= b; i += 1) if (l.frames[i]) s.add(l.frames[i].line);
  return s;
}

/* ---------- the cursor ---------- */
export type Cursor = { readonly p: number; readonly level: number };
const after = (s: readonly number[], p: number): number => s.find((x) => x > p) ?? p;
const before = (s: readonly number[], p: number): number => { let r = p; for (const x of s) { if (x < p) r = x; else break; } return r; };
const atLeast = (s: readonly number[], p: number): number => s.find((x) => x >= p) ?? s[s.length - 1] ?? p;
export const step = (l: Laid, c: Cursor): Cursor => ({ p: after(stopsAt(l, c.level), c.p), level: c.level });
export const back = (l: Laid, c: Cursor): Cursor => ({ p: before(stopsAt(l, c.level), c.p), level: c.level });
export function stepInto(l: Laid, c: Cursor): Cursor {
  const level = Math.min(l.stops.length - 1, c.level + 1);
  return { p: after(stopsAt(l, level), c.p), level };
}
export function stepOut(l: Laid, c: Cursor): Cursor {
  const level = Math.max(0, c.level - 1);
  return { p: atLeast(stopsAt(l, level), c.p), level };
}

/* ---------- the default level (§2.3.4) ---------- */
const same = (a: Value | undefined, b: Value | undefined): boolean => JSON.stringify(a) === JSON.stringify(b);
/* the step a → b changes something: a variable its block touches, or any variable where the block names
   none, or the frame carries an event */
export function changes(l: Laid, a: number, b: number, level: number): boolean {
  const fa = l.frames[a], fb = l.frames[b];
  if (!fa || !fb) return false;
  if (fb.ev) return true;
  const t = touchedAt(l, blockAt(l, b, level));
  const names = t.size ? [...t] : [...new Set([...Object.keys(fa.vars), ...Object.keys(fb.vars)])];
  return names.some((k) => !same(fa.vars[k], fb.vars[k]));
}
/* the coarsest level with at least three stops where every step changes something; else the coarsest with
   three stops; else the finest */
export function defaultLevel(l: Laid): number {
  const ok = (L: number): boolean => { const s = stopsAt(l, L); return s.length >= 3 && s.every((p, i) => i === 0 || changes(l, s[i - 1], p, L)); };
  for (let L = 0; L < l.stops.length; L += 1) if (ok(L)) return L;
  for (let L = 0; L < l.stops.length; L += 1) if (stopsAt(l, L).length >= 3) return L;
  return l.stops.length - 1;
}

/* ---------- scrubbing: the transport's time over the stops ----------
   Time τ runs 0 … n − 1 over n stops. At a whole τ = i the figure rests on stop i, having come from stop
   i − 1; in between, the move from stop i to i + 1 takes the first `move` of the beat (eased by the caller)
   and holds for the rest, the band and the lines already on the stop it moves to. */
export type Scrub = { readonly i: number; readonly from: number; readonly to: number; readonly k: number };
export function scrub(n: number, tau: number, move = 0.6): Scrub {
  if (n <= 1) return { i: 0, from: 0, to: 0, k: 1 };
  const t = Math.max(0, Math.min(n - 1, Number.isFinite(tau) ? tau : n - 1));
  const i = Math.floor(t), f = t - i;
  if (f < 1e-9) return { i, from: Math.max(0, i - 1), to: i, k: 1 };
  return { i: i + 1, from: i, to: i + 1, k: Math.min(1, f / move) };
}
