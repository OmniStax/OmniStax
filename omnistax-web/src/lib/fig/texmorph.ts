/* Formula morphs on the page, after Manim's TransformMatchingTex. A morph host always shows
   MathJax's SVG, still frames included; when the set of \mk keys changes, the glyph
   outlines bend from the old formula into the new one on an overlay and the new SVG takes
   over at the end. When only the values inside the keys change, the new formula shows at
   once, and a key the reader's hand changed glows beneath (glow.ts). The geometry is
   morphgeom's; this file measures, draws and times. */
import { mkKeys, morphPlan } from './motion';
import { glyphsOf, match, tracksOf, frame, retarget, pathD, plainTex, splitTex, boxOf, numberGlyphs, type Glyph, type KeyMap, type Track, type Pt } from './morphgeom';
import { step, glowOf, lit, byHand, inputSeq, type Trace } from './glow';
import type { Typeset, ViewBox } from './mathjax';
import { lazy, importing } from './lazy';

export type MorphOpts = { readonly ms?: number; readonly pathArc?: number; readonly keyMap?: KeyMap; readonly force?: boolean; readonly values?: boolean };
type Macros = Readonly<Record<string, string>>;
const MS = 1200, HIGHLIGHT_MS = 1200, CACHE = 400, SVGNS = 'http://www.w3.org/2000/svg';
const BETWEEN = '\u0000between';
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- MathJax, fetched on the first morph ---------- */
type Mj = typeof import('./mathjax');
const withMj = lazy(importing((): Promise<Mj> => import('./mathjax'))).use;

/* ---------- renders, cached by book, mode and string ----------
   An inline formula is set as one SVG per line-breakable piece (splitTex). */
type Part = Typeset & { node?: SVGSVGElement; glyphs?: readonly Glyph[]; inks?: { readonly sig: string; readonly list: readonly string[] } };
type Render = { readonly tex: string; readonly parts: readonly Part[] };
const renders = new Map<string, Render>();
const bookIds = new WeakMap<Macros, number>();
let nextBook = 0;
function renderOf(m: Mj, macros: Macros, tex: string, display: boolean): Render {
  const book = bookIds.get(macros) ?? (bookIds.set(macros, ++nextBook), nextBook);
  const id = `${book}\u0000${display ? 1 : 0}\u0000${tex}`, hit = renders.get(id);
  if (hit) { renders.delete(id); renders.set(id, hit); return hit; }
  const r: Render = { tex, parts: (display ? [tex] : splitTex(tex)).map((t): Part => ({ ...m.typeset(macros, t, display) })) };
  renders.set(id, r);
  if (renders.size > CACHE) renders.delete(renders.keys().next().value!);
  return r;
}
function nodeOf(r: Part): SVGSVGElement {
  if (!r.node) { const t = document.createElement('template'); t.innerHTML = r.markup; r.node = t.content.firstChild as SVGSVGElement; }
  return r.node.cloneNode(true) as SVGSVGElement;
}

/* ---------- a host's state ----------
   `anim` is the morph on screen, `next` the latest one asked for and not yet begun (asks
   within one frame coalesce), `after` a plain render to show once the morph lands. */
type Anim = { readonly tracks: readonly Track[]; readonly t0: number; readonly ms: number; readonly arc: number; t: number };
type Next = { readonly b: Render; readonly ms: number; readonly arc: number; readonly lag: number; readonly keyMap?: KeyMap };
type Host = { tex: string; display: boolean; shown: Render | null; target: Render | null; token: number; raf: number; fly: SVGSVGElement | null; scrub: Scrub | null; anim: Anim | null; next: Next | null; after: Render | null; macros: Macros; trace?: Trace; glowRaf: number };
type Scrub = { readonly sig: string; readonly tracks: readonly Track[]; readonly b: Render };
const hosts = new WeakMap<HTMLElement, Host>();
const hostOf = (el: HTMLElement): Host => hosts.get(el)
  ?? (hosts.set(el, { tex: '', display: false, shown: null, target: null, token: 0, raf: 0, fly: null, scrub: null, anim: null, next: null, after: null, macros: {}, glowRaf: 0 }), hosts.get(el)!);

function stop(el: HTMLElement, h: Host): void {
  if (h.raf) cancelAnimationFrame(h.raf);
  h.raf = 0; h.fly?.remove(); h.fly = null; h.anim = null; h.next = null; h.after = null;
  svgsOf(el).forEach((s) => { s.style.visibility = ''; });
}
const svgsOf = (el: HTMLElement): SVGSVGElement[] => Array.from(el.querySelectorAll<SVGSVGElement>(':scope > .tm svg.tm-part'));
function show(el: HTMLElement, h: Host, r: Render, macros: Macros, hidden = false): SVGSVGElement[] {
  const wrap = document.createElement('span'), inner = h.display ? document.createElement('span') : wrap;
  const svgs = r.parts.map(nodeOf);
  wrap.className = h.display ? 'tm katex-display' : 'tm katex';
  wrap.style.cssText = h.display ? 'position:relative;isolation:isolate' : 'position:relative;isolation:isolate;display:inline-block;max-width:100%';
  if (h.display) { inner.className = 'katex'; wrap.appendChild(inner); }
  svgs.forEach((svg, i) => { if (hidden) svg.style.visibility = 'hidden'; if (i) inner.append(' '); inner.appendChild(svg); });
  el.replaceChildren(wrap);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', plainTex(r.tex, macros));
  h.shown = r; h.fly = null;
  return svgs;
}

/* ---------- measuring a shown render into host pixels ----------
   One box read per piece; the inks are read once per piece and theme. */
function measure(svgs: readonly SVGSVGElement[], r: Render): Glyph[] | null {
  const gs = r.parts.map((p, i) => (svgs[i] ? measurePart(svgs[i], p)?.map((g) => ({ ...g, seg: i })) ?? null : null));
  return gs.every((g) => g) ? gs.flatMap((g) => g!) : null;
}
function inksOf(svg: SVGSVGElement, r: Part): readonly string[] {
  const sig = getComputedStyle(svg).color + '\u0000' + (document.documentElement.getAttribute('data-theme') ?? '');
  if (r.inks?.sig !== sig) r.inks = { sig, list: Array.from(svg.querySelectorAll('path, rect'), (e) => getComputedStyle(e).color) };
  return r.inks.list;
}
function measurePart(svg: SVGSVGElement, r: Part): Glyph[] | null {
  const sr = svg.getBoundingClientRect();
  if (!sr.width || !r.vb[2]) return null;
  const vb: ViewBox = r.vb, ox = sr.left + scrollX, oy = sr.top + scrollY;
  const kx = sr.width / vb[2], ky = sr.height / vb[3];
  const inks = inksOf(svg, r);
  r.glyphs ??= glyphsOf(r.tree);
  return r.glyphs.map((g, i) => ({ ...g, ink: inks[i] ?? '', rings: g.rings.map((ring) => ring.map((p): Pt => [ox + (p[0] - vb[0]) * kx, oy + (p[1] - vb[1]) * ky])) }));
}
/* Glyphs are measured in page coordinates, so a host that changes size under the morph leaves the
   old formula where it stood; the overlay sits in the new formula's box, shifted back to the page. */
function overlay(el: HTMLElement, h: Host): SVGSVGElement {
  h.fly?.remove();
  const wrap = el.querySelector<HTMLElement>(':scope > .tm') ?? el, wr = wrap.getBoundingClientRect();
  const fly = document.createElementNS(SVGNS, 'svg');
  fly.setAttribute('aria-hidden', 'true');
  fly.style.cssText = `position:absolute;left:${-(wr.left + scrollX + wrap.clientLeft)}px;top:${-(wr.top + scrollY + wrap.clientTop)}px;width:1px;height:1px;overflow:visible;pointer-events:none`;
  wrap.appendChild(fly);
  h.fly = fly;
  return fly;
}
function draw(fly: SVGSVGElement, tracks: readonly Track[], t: number, pathArc: number): void {
  const drawn = frame(tracks, t, pathArc);
  while (fly.childNodes.length < drawn.length) fly.appendChild(document.createElementNS(SVGNS, 'path'));
  while (fly.childNodes.length > drawn.length) fly.lastChild!.remove();
  drawn.forEach((d, i) => {
    const p = fly.childNodes[i] as SVGPathElement;
    p.setAttribute('d', pathD(d.rings)); p.setAttribute('fill', d.ink); p.setAttribute('opacity', d.opacity.toFixed(3));
  });
}
/* Both ends measured in place: the source as it stands, then the target laid out hidden. */
function prepare(el: HTMLElement, h: Host, a: Render, b: Render, macros: Macros, keyMap?: KeyMap): { tracks: Track[]; svg: SVGSVGElement[] } | null {
  const shownA = svgsOf(el);
  const svgA = h.shown === a && shownA.length ? shownA : show(el, h, a, macros);
  const ga = measure(svgA, a);
  const svgB = show(el, h, b, macros, true), gb = measure(svgB, b);
  return ga && gb ? { tracks: tracksOf(match(ga, gb, keyMap)), svg: svgB } : null;
}
function highlight(el: HTMLElement, h: Host, svg: readonly SVGSVGElement[], r: Render, added: readonly string[]): void {
  const gs = measure(svg, r)?.filter((g) => g.key !== null && added.includes(g.key));
  if (!gs?.length) return;
  const fly = overlay(el, h);
  added.forEach((k) => {
    const b = boxOf(gs.filter((g) => g.key === k).flatMap((g) => g.rings)), rect = document.createElementNS(SVGNS, 'rect');
    if (b.x1 <= b.x0) return;
    Object.entries({ x: b.x0 - 2, y: b.y0 - 2, width: b.x1 - b.x0 + 4, height: b.y1 - b.y0 + 4, rx: 3 }).forEach(([k2, v]) => rect.setAttribute(k2, String(v)));
    rect.style.fill = 'color-mix(in srgb, var(--accent) 22%, transparent)';
    fly.appendChild(rect);
  });
  fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: HIGHLIGHT_MS, easing: 'ease-in' }).finished.then(() => { if (h.fly === fly) h.fly = null; fly.remove(); }, () => fly.remove());
}

/* ---------- the glow under a changed value ----------
   A key's content is read off its glyph shapes, so two renders compare without the DOM. */
const keyVals = (r: Render, keys: readonly string[]): string[] => {
  const gs = r.parts.flatMap((p) => (p.glyphs ??= glyphsOf(p.tree)));
  return keys.map((k) => gs.filter((g) => g.key === k).map((g) => g.shape).join(' '));
};
function traceOf(h: Host, r: Render, fresh: boolean): Trace {
  const now = performance.now();
  return (h.trace = step(fresh ? undefined : h.trace, keyVals(r, mkKeys(r.tex)), inputSeq(), now, byHand(now)));
}
function glow(el: HTMLElement, h: Host, svgs: readonly SVGSVGElement[], r: Render, tr: Trace): void {
  cancelAnimationFrame(h.glowRaf); h.glowRaf = 0;
  if (!lit(tr, performance.now())) return;
  const keys = mkKeys(r.tex), gs = measure(svgs, r);
  const wrap = el.querySelector<HTMLElement>(':scope > .tm');
  if (!gs || !wrap) return;
  const wr = wrap.getBoundingClientRect(), ox = wr.left + scrollX + wrap.clientLeft, oy = wr.top + scrollY + wrap.clientTop;
  const layer = document.createElementNS(SVGNS, 'svg');
  layer.setAttribute('aria-hidden', 'true'); layer.classList.add('tm-glow');
  layer.style.width = wr.width + 'px'; layer.style.height = wr.height + 'px';   /* an unsized svg is 150 px tall and would overflow the readout */
  const bars = keys.map((k, i) => {
    const mine = gs.filter((g) => g.key === k), b = boxOf(numberGlyphs(mine).flatMap((g) => g.rings));
    if (!mine.length || b.x1 <= b.x0 || tr.lit[i] === -Infinity) return null;
    const rect = document.createElementNS(SVGNS, 'rect');
    Object.entries({ x: b.x0 - ox - 1.5, y: b.y0 - oy - 2, width: b.x1 - b.x0 + 3, height: b.y1 - b.y0 + 4, rx: 2 }).forEach(([a, v]) => rect.setAttribute(a, String(v)));
    layer.appendChild(rect);
    return { rect, t: tr.lit[i] };
  }).filter((x) => x !== null);
  wrap.appendChild(layer);
  const paint = (now: number): void => {
    h.glowRaf = 0;
    const alive = bars.map(({ rect, t }) => { const a = glowOf(t, now, REDUCED); rect.setAttribute('opacity', a.toFixed(3)); return a > 0; }).some(Boolean);
    if (alive && layer.isConnected) h.glowRaf = requestAnimationFrame(paint); else layer.remove();
  };
  paint(performance.now());
}

/* ---------- the morph loop ----------
   Each frame begins the latest asked-for morph, from the running one's present frame if one
   runs (so a drag never jumps back), else from the formula as it stands; then draws. */
function begin(el: HTMLElement, h: Host, n: Next, now: number): void {
  const a = h.anim, ga = a ? null : h.shown && measure(svgsOf(el), h.shown);
  const src = a ? retarget(a.tracks, a.t, a.arc) : ga ? { from: ga, fading: [] } : null;
  const svgB = show(el, h, n.b, h.macros, true), gb = src && measure(svgB, n.b);
  if (!src || !gb) { stop(el, h); return; }
  h.anim = { tracks: [...src.fading, ...tracksOf(match(src.from, gb, n.keyMap), 1.5, n.lag)], t0: now, ms: n.ms, arc: n.arc, t: 0 };
  overlay(el, h);
}
function tick(el: HTMLElement, h: Host, now: number): void {
  h.raf = 0;
  if (h.anim) h.anim.t = Math.min(1, (now - h.anim.t0) / h.anim.ms);
  if (h.next) { const n = h.next; h.next = null; begin(el, h, n, now); }
  const a = h.anim;
  if (!a || !h.fly) return;
  draw(h.fly, a.tracks, a.t, a.arc);
  if (a.t < 1) { h.raf = requestAnimationFrame((t) => tick(el, h, t)); return; }
  const after = h.after;
  stop(el, h);
  if (after) show(el, h, after, h.macros);
}

/* ---------- the two calls ---------- */
/* `morph(host, tex)`: a new set of \mk keys (or `force`) bends the shown formula into the new
   one; the same keys with new values re-render at once, the keys the reader's hand changed
   glowing beneath (never with `values: false`). */
export function morph(el: HTMLElement, tex: string, display: boolean, opts: MorphOpts, macros: Macros): void {
  const h = hostOf(el);
  if (h.tex === tex && h.display === display && !opts.force) return;
  const landing = h.tex === BETWEEN;
  h.tex = tex; h.display = display; h.scrub = null;
  const token = ++h.token;
  withMj((m) => {
    if (token !== h.token) return;
    const b = renderOf(m, macros, tex, display), from = h.target ?? h.shown;
    h.macros = macros;
    if (landing) { stop(el, h); h.target = b; show(el, h, b, macros); traceOf(h, b, true); return; }
    const plan = morphPlan(from ? mkKeys(from.tex) : [], mkKeys(tex)), full = !plan.same || !!opts.force;
    const tr = traceOf(h, b, full || opts.values === false);
    if (!from || !el.isConnected || !full) {
      if (h.anim && from && !full) { h.after = b; return; }
      stop(el, h); h.target = b; glow(el, h, show(el, h, b, macros), b, tr); return;
    }
    h.target = b;
    if (REDUCED) { stop(el, h); highlight(el, h, show(el, h, b, macros), b, plan.add); return; }
    h.after = null;
    h.next = { b, ms: opts.ms ?? MS, arc: opts.pathArc ?? 0, lag: 0.12, keyMap: opts.keyMap };
    h.raf ||= requestAnimationFrame((t) => tick(el, h, t));
  });
}

/* `morphAt(host, a, b, k)`: the frame at progress k of the morph from a to b, a pure function
   of k, for a story slider to scrub. The plan is measured once per pair and kept. */
export function morphAt(el: HTMLElement, a: string, b: string, k: number, display: boolean, opts: MorphOpts, macros: Macros): void {
  const h = hostOf(el), token = ++h.token;
  withMj((m) => {
    if (token !== h.token) return;
    stop(el, h);
    h.display = display; h.macros = macros;
    const ra = renderOf(m, macros, a, display), rb = renderOf(m, macros, b, display);
    const end = REDUCED ? (k < 0.5 ? ra : rb) : k <= 0 ? ra : k >= 1 ? rb : null;
    h.tex = end ? end.tex : BETWEEN; h.target = end;
    if (end) { if (h.shown !== end || !el.firstChild) show(el, h, end, macros); return; }
    const box = (el.parentElement ?? el).getBoundingClientRect();
    const sig = [a, b, display, box.left + scrollX, box.top + scrollY, box.width, getComputedStyle(el).color].join('\u0000');
    if (h.scrub?.sig !== sig) {
      const p = prepare(el, h, ra, rb, macros, opts.keyMap);
      if (!p) { show(el, h, k < 0.5 ? ra : rb, macros); return; }
      h.scrub = { sig, tracks: p.tracks, b: rb };
    } else if (h.shown !== rb) show(el, h, rb, macros, true);
    else svgsOf(el).forEach((s) => { s.style.visibility = 'hidden'; });
    draw(overlay(el, h), h.scrub.tracks, k, opts.pathArc ?? 0);
  });
}
