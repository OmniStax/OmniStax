/* Formula morphs on the page, after Manim's TransformMatchingTex. A morph host always shows
   MathJax's SVG, still frames included; when the set of \mk keys changes, the glyph
   outlines bend from the old formula into the new one on an overlay and the new SVG takes
   over at the end. The geometry is morphgeom's; this file measures, draws and times. */
import { mkKeys, morphPlan } from './motion';
import { glyphsOf, match, tracksOf, frame, pathD, plainTex, splitTex, boxOf, type Glyph, type KeyMap, type Track, type Pt } from './morphgeom';
import type { Typeset, ViewBox } from './mathjax';

export type MorphOpts = { readonly ms?: number; readonly pathArc?: number; readonly keyMap?: KeyMap; readonly force?: boolean };
type Macros = Readonly<Record<string, string>>;
const MS = 1200, HIGHLIGHT_MS = 1200, CACHE = 400, SVGNS = 'http://www.w3.org/2000/svg';
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- MathJax, fetched on the first morph ---------- */
type Mj = typeof import('./mathjax');
let mj: Mj | null = null;
let mjPending: Promise<Mj> | null = null;
const withMj = (use: (m: Mj) => void): void => {
  if (mj) { use(mj); return; }
  void (mjPending ??= import('./mathjax').then((m) => (mj = m))).then(use).catch(() => {});
};

/* ---------- renders, cached by book, mode and string ----------
   An inline formula is set as one SVG per line-breakable piece (splitTex). */
type Part = Typeset & { node?: SVGSVGElement; glyphs?: readonly Glyph[] };
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

/* ---------- a host's state ---------- */
type Host = { pending: Render | null; tex: string; display: boolean; shown: Render | null; token: number; raf: number; fly: SVGSVGElement | null; scrub: Scrub | null };
type Scrub = { readonly sig: string; readonly tracks: readonly Track[]; readonly b: Render };
const hosts = new WeakMap<HTMLElement, Host>();
const hostOf = (el: HTMLElement): Host => hosts.get(el) ?? (hosts.set(el, { pending: null, tex: '', display: false, shown: null, token: 0, raf: 0, fly: null, scrub: null }), hosts.get(el)!);

function stop(el: HTMLElement, h: Host): void {
  if (h.raf) cancelAnimationFrame(h.raf);
  h.raf = 0; h.fly?.remove(); h.fly = null;
  svgsOf(el).forEach((s) => { s.style.visibility = ''; });
}
const svgsOf = (el: HTMLElement): SVGSVGElement[] => Array.from(el.querySelectorAll<SVGSVGElement>(':scope > .tm svg.tm-part'));
function show(el: HTMLElement, h: Host, r: Render, macros: Macros, hidden = false): SVGSVGElement[] {
  const wrap = document.createElement('span'), inner = h.display ? document.createElement('span') : wrap;
  const svgs = r.parts.map(nodeOf);
  wrap.className = h.display ? 'tm katex-display' : 'tm katex';
  wrap.style.cssText = h.display ? 'position:relative' : 'position:relative;display:inline-block;max-width:100%';
  if (h.display) { inner.className = 'katex'; wrap.appendChild(inner); }
  svgs.forEach((svg, i) => { if (hidden) svg.style.visibility = 'hidden'; if (i) inner.append(' '); inner.appendChild(svg); });
  el.replaceChildren(wrap);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', plainTex(r.tex, macros));
  h.shown = r;
  return svgs;
}

/* ---------- measuring a shown render into host pixels ---------- */
function measure(svgs: readonly SVGSVGElement[], r: Render): Glyph[] | null {
  const gs = r.parts.map((p, i) => (svgs[i] ? measurePart(svgs[i], p)?.map((g) => ({ ...g, seg: i })) ?? null : null));
  return gs.every((g) => g) ? gs.flatMap((g) => g!) : null;
}
function measurePart(svg: SVGSVGElement, r: Part): Glyph[] | null {
  const sr = svg.getBoundingClientRect();
  if (!sr.width || !r.vb[2]) return null;
  const vb: ViewBox = r.vb, ox = sr.left + scrollX, oy = sr.top + scrollY;
  const kx = sr.width / vb[2], ky = sr.height / vb[3];
  const inks = Array.from(svg.querySelectorAll('path, rect'), (e) => getComputedStyle(e).color);
  r.glyphs ??= glyphsOf(r.tree);
  return r.glyphs.map((g, i) => ({ ...g, ink: inks[i] ?? '', rings: g.rings.map((ring) => ring.map((p): Pt => [ox + (p[0] - vb[0]) * kx, oy + (p[1] - vb[1]) * ky])) }));
}
/* Glyphs are measured in page coordinates, so a host that changes size under the morph leaves the
   old formula where it stood; the overlay sits in the new formula's box, shifted back to the page. */
function overlay(el: HTMLElement, h: Host): SVGSVGElement {
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

/* ---------- the two calls ---------- */
/* `morph(host, tex)`: a new set of \mk keys (or `force`) bends the shown formula into the
   new one; the same keys re-render at once, from the cache where the string was seen. */
export function morph(el: HTMLElement, tex: string, display: boolean, opts: MorphOpts, macros: Macros): void {
  const h = hostOf(el);
  if (h.tex === tex && h.display === display && !opts.force) return;
  h.tex = tex; h.display = display; h.scrub = null;
  const token = ++h.token;
  withMj((m) => {
    if (token !== h.token) return;
    const a0 = h.shown, b = renderOf(m, macros, tex, display);
    if (h.raf && a0 && !opts.force && morphPlan(mkKeys(a0.tex), mkKeys(tex)).same) { h.pending = b; return; }
    h.pending = null;
    stop(el, h);
    const a = h.shown, plan = morphPlan(a ? mkKeys(a.tex) : [], mkKeys(tex));
    if (!a || !el.isConnected || (plan.same && !opts.force)) { show(el, h, b, macros); return; }
    if (REDUCED) { highlight(el, h, show(el, h, b, macros), b, plan.add); return; }
    const p = prepare(el, h, a, b, macros, opts.keyMap);
    if (!p) { show(el, h, b, macros); return; }
    const fly = overlay(el, h), ms = opts.ms ?? MS, arc = opts.pathArc ?? 0;
    let t0 = -1;
    const tick = (now: number): void => {
      if (t0 < 0) t0 = now;
      const t = Math.min(1, (now - t0) / ms);
      draw(fly, p.tracks, t, arc);
      if (t < 1) { h.raf = requestAnimationFrame(tick); return; }
      h.raf = 0; stop(el, h);
      const next = h.pending;
      h.pending = null;
      if (next) show(el, h, next, macros);
    };
    draw(fly, p.tracks, 0, arc);
    h.raf = requestAnimationFrame(tick);
  });
}

/* `morphAt(host, a, b, k)`: the frame at progress k of the morph from a to b, a pure function
   of k, for a story slider to scrub. The plan is measured once per pair and kept. */
export function morphAt(el: HTMLElement, a: string, b: string, k: number, display: boolean, opts: MorphOpts, macros: Macros): void {
  const h = hostOf(el), token = ++h.token;
  withMj((m) => {
    if (token !== h.token) return;
    stop(el, h); h.pending = null;
    h.display = display;
    const ra = renderOf(m, macros, a, display), rb = renderOf(m, macros, b, display);
    const end = REDUCED ? (k < 0.5 ? ra : rb) : k <= 0 ? ra : k >= 1 ? rb : null;
    h.tex = (end ?? rb).tex;
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
