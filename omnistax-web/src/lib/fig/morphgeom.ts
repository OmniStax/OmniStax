/* The pure half of a formula morph, after Manim's TransformMatchingTex: glyph outlines
   flattened out of an SVG tree, parts matched by meaning, rings paired, resampled
   and aligned, and the frame at any progress as a function of that progress alone.
   Nothing here touches the page; texmorph measures the page and draws the frames. */
import { ease } from './motion';

/* ---------- points, matrices and outlines ---------- */
export type Pt = readonly [number, number];
export type Ring = readonly Pt[];
export type Mat = readonly [number, number, number, number, number, number];
export const ID: Mat = [1, 0, 0, 1, 0, 0];
export const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
export const apply = (m: Mat, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const nums = (s: string): number[] => Array.from(s.matchAll(NUM), (m) => +m[0]);

export function parseTransform(s: string | undefined): Mat {
  return Array.from((s ?? '').matchAll(/(\w+)\s*\(([^)]*)\)/g)).reduce<Mat>((m, [, op, args]) => {
    const a = nums(args);
    const t: Mat = op === 'translate' ? [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0]
      : op === 'scale' ? [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]
        : op === 'matrix' && a.length === 6 ? [a[0], a[1], a[2], a[3], a[4], a[5]]
          : op === 'rotate' ? rotateAbout((a[0] ?? 0) * Math.PI / 180, a[1] ?? 0, a[2] ?? 0)
            : ID;
    return mul(m, t);
  }, ID);
}
const rotateAbout = (r: number, cx: number, cy: number): Mat =>
  mul(mul([1, 0, 0, 1, cx, cy], [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]), [1, 0, 0, 1, -cx, -cy]);

/* An SVG path's subpaths as closed polylines, each curve cut into `segs` chords. */
export function parsePath(d: string, segs = 8): Ring[] {
  const toks = Array.from(d.matchAll(/[MmLlHhVvCcSsQqTtZzAa]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi), (m) => m[0]);
  const rings: Pt[][] = [];
  let ring: Pt[] = [], i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, prev = '';
  const n = (): number => +toks[i++];
  const close = (): void => { if (ring.length > 1) rings.push(ring); ring = []; };
  const curve = (pts: readonly Pt[]): void => {
    for (let k = 1; k <= segs; k++) {
      const t = k / segs, u = 1 - t;
      ring.push(pts.length === 3
        ? [u * u * pts[0][0] + 2 * u * t * pts[1][0] + t * t * pts[2][0], u * u * pts[0][1] + 2 * u * t * pts[1][1] + t * t * pts[2][1]]
        : [u ** 3 * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t ** 3 * pts[3][0],
          u ** 3 * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t ** 3 * pts[3][1]]);
    }
  };
  while (i < toks.length) {
    if (/[a-z]/i.test(toks[i])) cmd = toks[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), ox = rel ? x : 0, oy = rel ? y : 0, C = cmd.toUpperCase();
    if (C === 'Z') { x = sx; y = sy; close(); prev = C; cmd = ''; continue; }
    if (C === 'M') { close(); x = ox + n(); y = oy + n(); sx = x; sy = y; ring.push([x, y]); cmd = rel ? 'l' : 'L'; prev = C; continue; }
    if (!ring.length) ring.push([x, y]);
    if (C === 'L' || C === 'A') {
      if (C === 'A') i += 5;
      x = ox + n(); y = oy + n(); ring.push([x, y]);
    } else if (C === 'H') { x = ox + n(); ring.push([x, y]); }
    else if (C === 'V') { y = oy + n(); ring.push([x, y]); }
    else if (C === 'Q' || C === 'T') {
      const [qx, qy] = C === 'Q' ? [ox + n(), oy + n()] : prev === 'Q' || prev === 'T' ? [2 * x - cx, 2 * y - cy] : [x, y];
      const ex = ox + n(), ey = oy + n();
      curve([[x, y], [qx, qy], [ex, ey]]); cx = qx; cy = qy; x = ex; y = ey;
    } else if (C === 'C' || C === 'S') {
      const [ax, ay] = C === 'C' ? [ox + n(), oy + n()] : prev === 'C' || prev === 'S' ? [2 * x - cx, 2 * y - cy] : [x, y];
      const bx = ox + n(), by = oy + n(), ex = ox + n(), ey = oy + n();
      curve([[x, y], [ax, ay], [bx, by], [ex, ey]]); cx = bx; cy = by; x = ex; y = ey;
    } else i++;
    prev = C;
  }
  close();
  return rings.map((r) => (r.length > 2 && same(r[0], r[r.length - 1]) ? r.slice(0, -1) : r));
}
const same = (a: Pt, b: Pt): boolean => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;

/* ---------- ring measures ---------- */
export const area = (r: Ring): number => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
export const mean = (r: Ring): Pt => (r.length ? [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length] : [0, 0]);
export const perimeter = (r: Ring): number => r.reduce((s, p, i) => s + Math.hypot(r[(i + 1) % r.length][0] - p[0], r[(i + 1) % r.length][1] - p[1]), 0);
export type Box = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
export function boxOf(rings: readonly Ring[]): Box {
  const pts = rings.flat();
  return pts.length
    ? { x0: Math.min(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), y1: Math.max(...pts.map((p) => p[1])) }
    : { x0: 0, y0: 0, x1: 0, y1: 0 };
}
export const centre = (b: Box): Pt => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];

/* `n` points evenly spaced by arc length around a closed ring, from its first point. */
export function resample(r: Ring, n: number): Pt[] {
  const L = perimeter(r);
  if (r.length < 2 || L === 0) return Array.from({ length: n }, () => r[0] ?? [0, 0]);
  const out: Pt[] = [];
  let seg = 0, run = 0;
  for (let k = 0; k < n; k++) {
    const want = (L * k) / n;
    for (;;) {
      const a = r[seg], b = r[(seg + 1) % r.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (run + len >= want || seg === r.length - 1) { const t = len ? (want - run) / len : 0; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); break; }
      run += len; seg++;
    }
  }
  return out;
}

/* The cyclic shift of b that lies closest to a once both are centred on their means. */
export function bestOffset(a: Ring, b: Ring): number {
  const n = a.length, ma = mean(a), mb = mean(b);
  let best = 0, bestD = Infinity;
  for (let o = 0; o < n; o++) {
    let d = 0;
    for (let i = 0; i < n && d < bestD; i++) {
      const p = a[i], q = b[(i + o) % n];
      d += (p[0] - ma[0] - q[0] + mb[0]) ** 2 + (p[1] - ma[1] - q[1] + mb[1]) ** 2;
    }
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}
export const rotate = <T>(xs: readonly T[], o: number): T[] => xs.map((_, i) => xs[(i + o) % xs.length]);

/* ---------- pairing the rings of two shapes ----------
   Outer contours pair with outer contours and holes with holes, largest first; the shorter
   list is padded with rings collapsed to the centre of their partner. Each pair is resampled
   to one point count, `step` apart at most, and the second turned to sit on the first. */
export type RingPair = readonly [Pt[], Pt[]];
const degenerate = (partner: Ring, n: number): Pt[] => { const c = centre(boxOf([partner])); return Array.from({ length: n }, () => c); };
const byArea = (rs: readonly Ring[], sign: number): Ring[] => rs.filter((r) => Math.sign(area(r)) === sign || (sign > 0 && area(r) === 0)).sort((p, q) => Math.abs(area(q)) - Math.abs(area(p)));
const outerSign = (rs: readonly Ring[]): number => { const big = [...rs].sort((p, q) => Math.abs(area(q)) - Math.abs(area(p)))[0]; return big && area(big) < 0 ? -1 : 1; };
export function pairRings(A: readonly Ring[], B: readonly Ring[], step = 1.5): RingPair[] {
  const sa = outerSign(A), sb = outerSign(B);
  const groups: [Ring[], Ring[]][] = [[byArea(A, sa), byArea(B, sb)], [byArea(A, -sa), byArea(B, -sb)]];
  return groups.flatMap(([as, bs]) => Array.from({ length: Math.max(as.length, bs.length) }, (_, i): RingPair => {
    const a = as[i], b = bs[i];
    const n = Math.min(240, Math.max(12, Math.ceil(Math.max(a ? perimeter(a) : 0, b ? perimeter(b) : 0) / step)));
    if (!a) return [degenerate(b, n), resample(b, n)];
    if (!b) return [resample(a, n), degenerate(a, n)];
    const ra = resample(a, n), rb = resample(b, n);
    return [ra, rotate(rb, bestOffset(ra, rb))];
  }));
}

/* ---------- glyphs out of an SVG tree ----------
   A glyph is one drawn path or rule, its outline in the root's coordinates, its shape (the
   font outline it was cut from, whatever its place and size) and the innermost \mk key
   around it. */
export type SvgNode = { readonly tag: string; readonly attrs: Readonly<Record<string, string>>; readonly children: readonly SvgNode[] };
export type Glyph = { readonly shape: string; readonly key: string | null; readonly rings: readonly Ring[]; readonly ink: string; readonly seg?: number; readonly op?: boolean; readonly alpha?: number };
/* Operator and relation glyphs by MathJax's data-c code (= + − × · / brackets bars √ < > ≤ ≥ ≈ ≠ ± → ⇌);
   rules, the fraction bars and radical overbars, are operators too. */
const OPS = new Set(['3D', '2B', '2212', 'D7', 'B7', '22C5', '2F', '28', '29', '5B', '5D', '7B', '7D', '7C', '221A', '3C', '3E', '2264', '2265', '2248', '2260', 'B1', '2192', '21CC']);
export const MK_CLASS = 'hd-mk=';
const hash = (s: string): string => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const keyOf = (n: SvgNode): string | null => (n.attrs.class ?? '').split(/\s+/).find((c) => c.startsWith(MK_CLASS))?.slice(MK_CLASS.length) ?? null;
export function glyphsOf(root: SvgNode): Glyph[] {
  const walk = (n: SvgNode, m: Mat, key: string | null): Glyph[] => {
    const mm = n === root ? m : mul(m, parseTransform(n.attrs.transform)), k = keyOf(n) ?? key;
    if (n.tag === 'path' && n.attrs.d) return [{ shape: 'p' + (n.attrs['data-c'] ?? '') + hash(n.attrs.d), key: k, op: OPS.has((n.attrs['data-c'] ?? '').toUpperCase()), rings: parsePath(n.attrs.d).map((r) => r.map((p) => apply(mm, p))), ink: '' }];
    if (n.tag === 'rect') {
      const x = +(n.attrs.x ?? 0), y = +(n.attrs.y ?? 0), w = +(n.attrs.width ?? 0), h = +(n.attrs.height ?? 0);
      return [{ shape: 'rect', key: k, op: true, rings: [([[x, y], [x + w, y], [x + w, y + h], [x, y + h]] as Pt[]).map((p) => apply(mm, p))], ink: '' }];
    }
    const inner = n.tag === 'svg' && n !== root ? mul(mm, [1, 0, 0, 1, +(n.attrs.x ?? 0), +(n.attrs.y ?? 0)]) : mm;
    return n.children.flatMap((c) => walk(c, inner, k));
  };
  return walk(root, ID, null);
}

/* ---------- matching parts ----------
   By meaning, as TransformMatchingTex with every term tagged: a key moves to the same key,
   and a keyMap sends a key elsewhere, one to one, several to one (they bend together into
   it) or one to several (it bends out into them). Untagged glyphs match only when they are
   the same operator or relation, in order, within the same segment between top-level =
   signs, and no further than REACH of the formula's width; untagged letters and digits
   never match (`loose` lets every untagged glyph match by shape, for a formula whose keys
   stayed and whose values changed). Whatever is left fades with a short drift, at most
   DRIFT of the width: the source's leftovers toward the centre of the target's, the
   target's from the source's. */
export const REACH = 0.35, DRIFT = 0.04;
export type KeyMap = Readonly<Record<string, string | readonly string[]>>;
/* One matched pair of parts, with each end's weight: the extra sources of a many-to-one
   end at 0 and the extra targets of a one-to-many start at 0, so each end reads as one. */
export type Move = readonly [readonly Glyph[], readonly Glyph[], number, number];
export type Match = { readonly moves: readonly Move[]; readonly out: readonly Glyph[]; readonly in: readonly Glyph[]; readonly shift: Pt };
const xOf = (g: Glyph): number => centre(boxOf(g.rings))[0];
const reading = (gs: readonly Glyph[]): Glyph[] => [...gs].sort((a, b) => xOf(a) - xOf(b));
const groupBy = (gs: readonly Glyph[], f: (g: Glyph) => string): Map<string, Glyph[]> =>
  gs.reduce((m, g) => m.set(f(g), [...(m.get(f(g)) ?? []), g]), new Map<string, Glyph[]>());
/* Index pairs of a longest common subsequence of two shape sequences. */
export function lcs(a: readonly Glyph[], b: readonly Glyph[]): [number, number][] {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i].shape === b[j].shape ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: [number, number][] = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i].shape === b[j].shape) { out.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return out;
}
/* The key edges: the keyMap's first, then each key to itself where no edge claims it. */
export function keyEdges(from: readonly string[], to: readonly string[], keyMap: KeyMap = {}): [string, string][] {
  const has = new Set(to);
  const mapped: [string, string][] = Object.entries(keyMap).flatMap(([a, bs]) => (from.includes(a) ? (typeof bs === 'string' ? [bs] : bs).filter((b) => has.has(b)).map((b): [string, string] => [a, b]) : []));
  const claimed = new Set(mapped.flatMap(([a, b]) => [a, b]));
  return [...mapped, ...from.filter((k) => has.has(k) && !claimed.has(k)).map((k): [string, string] => [k, k])];
}
export function match(src: readonly Glyph[], tgt: readonly Glyph[], keyMap: KeyMap = {}, loose = false): Match {
  const ks = groupBy(src.filter((g) => g.key !== null), (g) => g.key!), kt = groupBy(tgt.filter((g) => g.key !== null), (g) => g.key!);
  const edges = keyEdges([...ks.keys()], [...kt.keys()], keyMap);
  const keyed = edges.map(([a, b]): Move => [reading(ks.get(a)!), reading(kt.get(b)!),
    edges.find((e) => e[0] === a)![1] === b ? 1 : 0, edges.find((e) => e[1] === b)![0] === a ? 1 : 0]);
  const free = (g: Glyph): boolean => g.key === null && (loose || !!g.op);
  const us = groupBy(src.filter(free), (g) => String(g.seg ?? 0)), ut = groupBy(tgt.filter(free), (g) => String(g.seg ?? 0));
  const wide = Math.max(1, ...[src, tgt].map((gs) => { const b = boxOf(gs.flatMap((g) => g.rings)); return b.x1 - b.x0; }));
  const mid = (gs: readonly Glyph[]): Pt => centre(boxOf(gs.flatMap((g) => g.rings)));
  const near = ([a, b]: Move): boolean => { const p = mid(a), q = mid(b); return Math.hypot(q[0] - p[0], q[1] - p[1]) <= REACH * wide; };
  const shaped = [...us].flatMap(([s, gs]) => lcs(gs, ut.get(s) ?? []).map(([i, j]): Move => [[gs[i]], [ut.get(s)![j]], 1, 1])).filter(near);
  const moves = [...keyed, ...shaped];
  const usedS = new Set(moves.flatMap(([a]) => a)), usedT = new Set(moves.flatMap(([, b]) => b));
  const out = src.filter((g) => !usedS.has(g)), inn = tgt.filter((g) => !usedT.has(g));
  const v: Pt = out.length && inn.length ? ((a, b) => [b[0] - a[0], b[1] - a[1]] as Pt)(mid(out), mid(inn)) : [0, 0];
  const len = Math.hypot(v[0], v[1]), k = len > DRIFT * wide ? (DRIFT * wide) / len : 1;
  const shift: Pt = [v[0] * k, v[1] * k];
  return { moves, out, in: inn, shift };
}

/* Within one matched term, glyphs pair along the longest run of shapes both share, in reading
   order, and the glyphs between two anchors pair in order, so a changed digit bends in its own
   place (50 into 51: the 5 stays, the 0 bends into the 1). A glyph left over pairs with
   nothing and grows from, or shrinks to, its own centre. */
export function pairGlyphs(A: readonly Glyph[], B: readonly Glyph[]): (readonly [Glyph | null, Glyph | null])[] {
  const a = reading(A), b = reading(B), anchors = [...lcs(a, b), [a.length, b.length] as [number, number]];
  const out: (readonly [Glyph | null, Glyph | null])[] = [];
  let i = 0, j = 0;
  anchors.forEach(([ai, bj]) => {
    const n = Math.max(ai - i, bj - j);
    for (let k = 0; k < n; k++) out.push([i + k < ai ? a[i + k] : null, j + k < bj ? b[j + k] : null]);
    if (ai < a.length) out.push([a[ai], b[bj]]);
    i = ai + 1; j = bj + 1;
  });
  return out;
}

/* ---------- tracks and frames ----------
   A track is one drawn piece: its rings at the start and the end, its ink and opacity at
   both, the window it moves in on the shared progress, and the glyph it lands as (or, when
   it fades out, the one it leaves). The frame at t is a function of t alone, so a story
   slider can scrub it. */
export type Rgba = readonly [number, number, number, number];
export type Track = { readonly a: readonly Pt[][]; readonly b: readonly Pt[][]; readonly inkA: string; readonly inkB: string; readonly opA: number; readonly opB: number; readonly start: number; readonly span: number; readonly moves: boolean; readonly end: Glyph; readonly quick?: boolean };
export type Drawn = { readonly rings: readonly Pt[][]; readonly ink: string; readonly opacity: number };
export const LAG = 0.12;
const shifted = (rs: readonly Ring[], v: Pt): Pt[][] => rs.map((r) => r.map((p) => [p[0] + v[0], p[1] + v[1]] as Pt));
const collapsed = (g: Glyph): Glyph => { const c = centre(boxOf(g.rings)); return { ...g, rings: g.rings.map((r) => r.map(() => c)) }; };
type Piece = Omit<Track, 'start' | 'span'>;
function moveTrack(g: Glyph | null, h: Glyph | null, wA: number, wB: number, step: number): Piece {
  const a = g ?? collapsed(h!), b = h ?? collapsed(g!);
  const pairs = pairRings(a.rings, b.rings, step);
  return { a: pairs.map((p) => p[0]), b: pairs.map((p) => p[1]), inkA: a.ink || b.ink, inkB: b.ink || a.ink, opA: g ? (g.alpha ?? 1) * wA : 0, opB: h ? wB : 0, moves: true, end: h ?? g! };
}
/* A key's glyphs bend when the two contents read as the same text changing: their longest
   shared run covers half the longer one, or the counts differ by one at most. Otherwise the
   key crossfades where it stands, the old glyphs out and the new in, carried as the key moves. */
export const bends = (A: readonly Glyph[], B: readonly Glyph[]): boolean =>
  Math.abs(A.length - B.length) <= 1 || 2 * lcs(reading(A), reading(B)).length >= Math.max(A.length, B.length);
/* Parts on their way out are gone by FADE_BY of the window, before the survivors settle. */
export const FADE_BY = 0.6;
const fadeOut = (g: Glyph, v: Pt, moves: boolean, w = 1): Piece => ({ a: g.rings.map((r) => [...r]), b: shifted(g.rings, v), inkA: g.ink, inkB: g.ink, opA: (g.alpha ?? 1) * w, opB: 0, moves, end: g, quick: true });
const fadeIn = (g: Glyph, v: Pt, moves: boolean, w = 1): Piece => ({ a: shifted(g.rings, [-v[0], -v[1]]), b: g.rings.map((r) => [...r]), inkA: g.ink, inkB: g.ink, opA: 0, opB: w, moves, end: g });
export function tracksOf(m: Match, step = 1.5, lag = LAG): Track[] {
  const moving = m.moves.flatMap(([A, B, wA, wB]) => {
    if (bends(A, B)) return pairGlyphs(A, B).map(([g, h]) => ({ x: xOf((h ?? g)!), t: moveTrack(g, h, wA, wB, step) }));
    const p = centre(boxOf(A.flatMap((g) => g.rings))), q = centre(boxOf(B.flatMap((g) => g.rings))), v: Pt = [q[0] - p[0], q[1] - p[1]];
    return [...A.map((g) => ({ x: xOf(g), t: fadeOut(g, v, true, wA) })), ...B.map((g) => ({ x: xOf(g), t: fadeIn(g, v, true, wB) }))];
  });
  const outs = m.out.map((g) => ({ x: xOf(g), t: fadeOut(g, m.shift, false) }));
  const ins = m.in.map((g) => ({ x: xOf(g), t: fadeIn(g, m.shift, false) }));
  const all = [...moving, ...outs, ...ins].sort((p, q) => p.x - q.x);
  return all.map(({ t }, i) => {
    const start = all.length > 1 ? (lag * i) / (all.length - 1) : 0;
    return { ...t, start, span: t.quick ? Math.max(0.05, FADE_BY - start) : 1 - lag };
  });
}

/* Manim's path_along_arc: the straight path bent into an arc of `angle` radians. */
export function arcLerp(a: Pt, b: Pt, t: number, angle: number): Pt {
  if (Math.abs(angle) < 1e-3) return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const vx = (b[0] - a[0]) / 2, vy = (b[1] - a[1]) / 2, k = 1 / Math.tan(angle / 2);
  const cx = a[0] + vx - vy * k, cy = a[1] + vy + vx * k, r = angle * t, c = Math.cos(r), s = Math.sin(r);
  const dx = a[0] - cx, dy = a[1] - cy;
  return [cx + c * dx - s * dy, cy + s * dx + c * dy];
}
export function parseInk(s: string): Rgba | null {
  const v = nums(s);
  if (s.startsWith('color(srgb') && v.length >= 3) return [v[0] * 255, v[1] * 255, v[2] * 255, v[3] ?? 1];
  return s.startsWith('rgb') && v.length >= 3 ? [v[0], v[1], v[2], v[3] ?? 1] : null;
}
export function mixInk(a: string, b: string, t: number): string {
  if (a === b || t <= 0) return t >= 1 ? b : a;
  const p = parseInk(a), q = parseInk(b);
  if (!p || !q) return t < 0.5 ? a : b;
  const m = p.map((x, i) => x + (q[i] - x) * t);
  return `rgb(${m[0].toFixed(0)} ${m[1].toFixed(0)} ${m[2].toFixed(0)} / ${m[3].toFixed(3)})`;
}
export function frame(tracks: readonly Track[], t: number, pathArc = 0): Drawn[] {
  return tracks.map((tr) => {
    const e = ease.smooth((t - tr.start) / tr.span), ang = tr.moves ? -pathArc : 0;
    return {
      rings: tr.a.map((r, i) => r.map((p, j) => arcLerp(p, tr.b[i][j], e, ang))),
      ink: mixInk(tr.inkA, tr.inkB, e),
      opacity: tr.opA + (tr.opB - tr.opA) * e,
    };
  });
}

/* ---------- retargeting a running morph ----------
   The frame at t becomes the source of the next morph: a piece on its way to the target
   stands as a glyph of that target (its key, shape and segment) at its present outline, ink
   and opacity; a piece on its way out keeps fading from where it is. */
export function retarget(tracks: readonly Track[], t: number, pathArc = 0): { readonly from: Glyph[]; readonly fading: Track[] } {
  const drawn = frame(tracks, t, pathArc);
  const from = tracks.flatMap((tr, i) => (tr.opB > 0 && drawn[i].opacity > 0 ? [{ ...tr.end, rings: drawn[i].rings, ink: drawn[i].ink, alpha: drawn[i].opacity }] : []));
  const fading = tracks.flatMap((tr, i): Track[] => (tr.opB > 0 || drawn[i].opacity <= 0 ? []
    : [{ ...tr, a: drawn[i].rings.map((r) => [...r]), inkA: drawn[i].ink, opA: drawn[i].opacity, start: 0, span: FADE_BY }]));
  return { from, fading };
}

export const pathD = (rings: readonly Ring[]): string =>
  rings.map((r) => 'M' + r.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z').join('');

/* ---------- line breaks ----------
   Inline, KaTeX lets a line break after a relation at the top level; the morph host sets
   each piece up to and including a top-level = as its own SVG, so it wraps the same way. */
export function splitTex(tex: string): string[] {
  const out: string[] = [];
  let depth = 0, from = 0;
  for (let i = 0; i < tex.length; i++) {
    const c = tex[i];
    if (c === '\\') {
      const w = /^\\(left|right|begin|end)(?![a-zA-Z])/.exec(tex.slice(i));
      if (w) depth += w[1] === 'left' || w[1] === 'begin' ? 1 : -1;
      i++;
    } else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '=' && depth === 0) { out.push(tex.slice(from, i + 1)); from = i + 1; }
  }
  return [...out, tex.slice(from)].map((s) => s.trim()).filter(Boolean);
}

/* ---------- the plain text of a formula ----------
   What the aria-label reads: the book's macros expanded, the colour and key wrappers
   dropped, fractions and roots written out and the rest of the markup stripped. */
const GREEK: Readonly<Record<string, string>> = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', nu: 'ν', pi: 'π', rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ', phi: 'φ', omega: 'ω', Omega: 'Ω', times: '×', cdot: '·', pm: '±', to: '→', rightarrow: '→', leftrightarrow: '⇌', rightleftharpoons: '⇌', approx: '≈', ne: '≠', le: '≤', ge: '≥', infty: '∞', circ: '°' };
const WRAPS = new Set(['mk', 'htmlClass', 'htmlData', 'class']), FRACS = new Set(['frac', 'dfrac', 'tfrac']);
const KEEPS = new Set(['text', 'mathrm', 'mathit', 'mathbf', 'mathsf', 'operatorname', 'vec', 'overrightarrow', 'boldsymbol']);
function group(s: string, i: number): [string, number] {
  let j = i;
  while (s[j] === ' ') j++;
  if (s[j] !== '{') return [s[j] ?? '', j + 1];
  for (let depth = 0, k = j; k < s.length; k++) {
    depth += s[k] === '{' ? 1 : s[k] === '}' ? -1 : 0;
    if (depth === 0) return [s.slice(j + 1, k), k + 1];
  }
  return [s.slice(j + 1), s.length];
}
function spoken(s: string): string {
  let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '{') { const [g, n] = group(s, i); out += spoken(g); i = n; continue; }
    if (c !== '\\') { out += c === '}' ? '' : c; i++; continue; }
    const name = /^\\([a-zA-Z]+|.?)/.exec(s.slice(i))![1];
    i += name.length + 1;
    if (WRAPS.has(name)) { const [, n] = group(s, i); const [g, m] = group(s, n); out += spoken(g); i = m; }
    else if (FRACS.has(name)) { const [a, n] = group(s, i); const [b, m] = group(s, n); out += `(${spoken(a)})/(${spoken(b)})`; i = m; }
    else if (name === 'sqrt') { const [g, n] = group(s, i); out += `√(${spoken(g)})`; i = n; }
    else if (KEEPS.has(name)) { const [g, n] = group(s, i); out += spoken(g); i = n; }
    else out += GREEK[name] ?? ' ';
  }
  return out;
}
export function plainTex(tex: string, macros: Readonly<Record<string, string>> = {}): string {
  const names = Object.keys(macros).sort((a, b) => b.length - a.length).map((k) => k.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'));
  const re = names.length ? new RegExp(`(${names.join('|')})(?![a-zA-Z])`, 'g') : null;
  let s = tex;
  for (let i = 0; i < 6 && re; i++) {
    const next = s.replace(re, (name) => macros[name].replace(/#\d/g, ''));
    if (next === s) break;
    s = next;
  }
  return spoken(s).replace(/\s+/g, ' ').trim();
}
