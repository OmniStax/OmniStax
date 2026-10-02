<script lang="ts">
  /* The concept map: a mind map of what the book teaches. A concept stands at a
     radius that grows with how deep its prerequisites run, so what the level
     takes for granted gathers at the centre and what it builds last lies at the
     rim; the prerequisite edges pull what needs each other into clusters, and
     the edges themselves are drawn behind the nodes. The map is as large as it
     needs to be rather than fitted to the pane: the reader drags the background
     to walk it and the wheel to come closer, and the find box jumps the view to
     a concept by name. Only what the viewport holds is drawn, so a book of
     hundreds of concepts costs what is on screen.

     The map is the whole pane. The legend, the find box and the trail that says
     where the view stands float in its corners rather than standing above it.
     A level opens fitted and centred, or, when it holds more than a hundred
     concepts, centred at the scale that shows a hundred; it is refitted while
     the reader has not yet walked it. Each level keeps where the reader left it
     while they step between levels along the trail, and lets it go when they
     choose another place from the trail's menus.

     Hovering a node lights its edges and neighbours and steps the rest of the
     map back. A click selects a node, Ctrl- or Cmd-click adds it to the
     selection or takes it out, a Shift-drag on the background draws a lasso,
     and a click on the background lets the selection go — the drawing tools'
     way, and the conversation tree's. Focus keeps the selection, every
     prerequisite of it and every concept built on it, draws them closer
     together and lets the rest fade; Unfocus puts them back. Neither moves the
     view. The goto card opens on hover, or on a double-click where cards open
     on click; a double-click also pins the concept, and opens another
     section's node in its section. A press that travels is a drag, not a
     click, so a node dragged onto a note still stands there as a card of its own.

     Nothing of the layout is computed while the page is held. The build settles
     every scope the reader can stand at and writes the places into layout.json,
     which is fetched the first time a map draws; a node set the build did not
     foresee is settled in a worker, with the seed rings drawn meanwhile.

     A node's shape says what kind of thing it is, the way a textbook page does:
     a definition is a plain box (a name to hold), an axiom stands on a heavy
     rule down its left edge (what the book takes as given), a result is a box
     under a double rule (the boxed law at the end of a derivation), an idea is
     a soft box with no rule, and a skill carries a wrench (something to do
     rather than something to know). Colour only seconds the shape, and the
     dashed rule is kept for another section's work. Each kind in the legend is
     a switch that takes that kind's nodes off the map and puts them back; the
     layout stays where it is, so nothing moves under the reader. A node is as
     wide as its name's lines, inside the room the layout kept for it.
     How the reader stands on a concept is a second reading drawn inside the node
     rather than a change of its shape or its hue: a thin bar along the bottom
     edge, as long as the concept's discrete evidence stands towards mastery,
     in the three colours the mastery box wears everywhere else. A concept with
     exercises and no evidence yet carries the shortest low bar; one with no
     exercises carries none. The switch beside the legend takes that reading
     away again; it belongs to this map alone, and opens the way the setting
     "Progress on the concept map" says. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { availabilityOf } from '../../lib/practice/model';
  import { settings } from '../../lib/settings/store.svelte';
  import { getContext as getCtx, onDestroy, tick, untrack } from 'svelte';
  import type { Target } from '../../lib/sections/scope';
  import { pin, goConceptFromView } from '../../lib/sections/concepts.svelte';
  import { spy } from '../../lib/sections/spy.svelte';
  import { openSectionFromView, openingInView } from '../../lib/sections/nav.svelte';
  import { scopedNodes, edgesOf } from '../../lib/sections/dag';
  import { boxOf, extentOf, gridOf, idsIn, keyOf, layoutNodes, placesFor, seedPositions, type Positions, type Pt, type Rect } from '../../lib/sections/forcelayout';
  import { loadLayouts, positionsOf, type LayoutFileDTO } from '../../lib/sections/layouts';
  import { connectedOf, crowdScale, mapViews, packed, touched, viewKeyOf } from '../../lib/sections/mapview';
  import type { LayoutReply, LayoutRequest } from '../../lib/sections/layout.worker';
  import { conceptId, sectionId, sectionRef } from '../../lib/types/ids';
  import type { ConceptKind } from '../../lib/content/schema';
  import { KINDS } from '../../lib/sections/conceptlists';
  import { figFor } from '../../lib/fig/figlib';
  import { dragout } from '../../lib/notes/md/dragout';
  import { select } from 'd3-selection';
  import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  let { item }: { item: string } = $props();
  const scoped = getCtx<() => Target>('scope');
  const book = $derived(scoped().book);
  const viewKey = $derived(viewKeyOf(item, scoped()));
  const list = $derived(scopedNodes(registry.concepts(book), scoped(), registry.manifest(book)));
  const edges = $derived(edgesOf(list));
  const byId = $derived(new Map(list.map((c) => [c.id, c])));
  const node = (id: string) => byId.get(id)!;
  const coverage = $derived.by(() => {
    const { span, section } = spy.current; if (!span || span.book !== book) return undefined;
    const all = registry.coverage(book); return all.find((c) => c.span === span.span) ?? all.find((c) => c.span === section?.span);
  });
  /* A concept's name, set in its own book's TeX. */
  const mathHtml = (node: HTMLElement, html: string) => {
    const write = (s: string): void => { node.innerHTML = s; figFor(book).renderMath(node); };
    write(html); return { update: write };
  };
  /* A node drawn as wide as its longest line rather than as the room it was
     kept: a name that wraps would otherwise leave its box at the widest a node
     may be, with the slack on either side of the lines. */
  const snug = (btn: HTMLElement) => {
    const fit = (): void => {
      btn.style.width = '';
      const name = btn.querySelector('.name'); if (!name) return;
      const lines = [...name.getClientRects()]; if (lines.length < 2) return;
      const scale = btn.getBoundingClientRect().width / (btn.offsetWidth || 1) || 1;
      const cs = getComputedStyle(btn);
      const frame = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      const w = Math.ceil(Math.max(...lines.map((r) => r.width)) / scale + frame + 1);
      if (w < btn.offsetWidth) btn.style.width = `${w}px`;
    };
    let live = true;
    const f = requestAnimationFrame(fit);
    void document.fonts?.ready.then(() => { if (live) fit(); });
    return { destroy: () => { live = false; cancelAnimationFrame(f); } };
  };
  let hover = $state<string | null>(null);   /* the node under the pointer, which lights its edges and its neighbours */
  /* The node whose card a double-click opened, whose concept is pinned. */
  let open = $state<string | null>(null);
  /* Whether this map draws the practice bars. It starts where the setting says
     and is this map's own from then on: another map, or this one opened again,
     starts from the setting afresh. */
  let showProgress = $state(settings.mapProgress);
  /* How far the concept's discrete evidence stands towards mastery, 0 to 1. */
  const share = (id: string): number => practice.share(id);
  /* Which concepts have exercises to practise them by: the book's problem sets
     are fetched for it the first time the bars are drawn. */
  $effect(() => { if (showProgress) void books.load(book); });
  const practicable = $derived(showProgress ? availabilityOf(practice.catalog()) : {});
  const boxes = $derived(new Map(list.map((c) => [c.id, boxOf(c)])));
  const boxAt = (id: string) => boxes.get(id)!;

  /* ---------- where the nodes stand ----------

     Four ways a scope can be placed, in the order they are tried: this
     session's cache, the file the build settled, the worker, and — for a scope
     small enough that the frame will not be missed — this thread. Until one of
     them has answered, the seed rings are drawn, which are where the forces
     would have started anyway. */
  type Source = 'cache' | 'build' | 'worker' | 'here' | 'seed';
  type Settled = { readonly pos: Positions; readonly ms: number; readonly source: Source };
  /* A scope small enough to settle between two frames rather than off the thread. */
  const MAIN_THREAD_MAX = 150;
  const cache = new Map<string, Settled>();
  const key = $derived(keyOf(list));
  let table = $state<LayoutFileDTO | null>(null);   /* the build's file, once it has been fetched */
  /* How long the map will hold still for that file before settling its own. */
  const FILE_GRACE_MS = 1200;
  let waited = $state(false);
  let settled = $state<Settled>({ pos: new Map(), ms: 0, source: 'seed' });
  const pos = $derived(settled.pos);
  const laying = $derived(settled.source === 'seed' && list.length > 0);

  $effect(() => {
    const url = registry.manifest(book).concepts;
    if (!url) { table = {}; return; }
    let live = true;
    loadLayouts(url).then((t) => { if (live) table = t; });
    const t = setTimeout(() => { if (live) waited = true; }, FILE_GRACE_MS);
    return () => { live = false; clearTimeout(t); };
  });

  /* One worker for this map, made the first time a scope needs it. A reply that
     is no longer the scope on screen is still worth keeping: the reader may
     walk back to it. */
  let worker: Worker | null = null;
  const workerFor = (): Worker | null => {
    if (worker) return worker;
    try { worker = new Worker(new URL('../../lib/sections/layout.worker.ts', import.meta.url), { type: 'module' }); }
    catch { return null; }
    worker.onmessage = (e: MessageEvent<LayoutReply>) => {
      const reply = e.data;
      const answer: Settled = { pos: new Map(reply.places.map(([id, x, y]) => [id, { x, y }])), ms: reply.ms, source: 'worker' };
      cache.set(reply.key, answer);
      if (reply.key === key) settled = answer;
    };
    worker.onerror = () => { worker?.terminate(); worker = null; };
    return worker;
  };
  onDestroy(() => { worker?.terminate(); worker = null; cancelAnimationFrame(glide); });

  $effect(() => {
    const k = key, here = list, wires = edges, file = table;
    const had = cache.get(k);
    if (had) { settled = had; return; }
    if (!here.length) { settled = { pos: new Map(), ms: 0, source: 'cache' }; return; }
    const nodes = layoutNodes(here);
    /* nothing is drawn in the wrong place while the answer is on its way */
    settled = { pos: seedPositions(nodes), ms: 0, source: 'seed' };
    /* The build's file is worth a short wait and no more. Where it is slow to
       come — a development server settles it on request — the map settles the
       scope itself rather than sitting on its seed rings; the file is still
       taken up for any scope reached after it lands. */
    if (!file && !waited) return;
    const built = file ? positionsOf(file, k) : null;
    if (built) { const answer: Settled = { pos: built, ms: 0, source: 'build' }; cache.set(k, answer); settled = answer; return; }
    const w = here.length > MAIN_THREAD_MAX ? workerFor() : null;
    if (w) { w.postMessage({ key: k, nodes, edges: wires } satisfies LayoutRequest); return; }
    const t0 = performance.now();
    const answer: Settled = { pos: placesFor(here), ms: Math.round(performance.now() - t0), source: 'here' };
    cache.set(k, answer); settled = answer;
  });

  const extent = $derived(extentOf(pos));
  const grid = $derived(gridOf(pos));

  /* Which edges each node owns, so a hover can light its neighbours without a relayout. */
  const near = $derived.by(() => {
    const m = new Map<string, Set<string>>();
    edges.forEach(([a, b]) => { (m.get(a) ?? m.set(a, new Set()).get(a)!).add(b); (m.get(b) ?? m.set(b, new Set()).get(b)!).add(a); });
    return m;
  });
  const lit = $derived(hover ? new Set([hover, ...(near.get(hover) ?? [])]) : null);

  /* ---------- the selection and the focus ----------

     A focus is the subgraph and the places it is packed into. `mix` runs from
     0, every node at home, to 1, the focus packed; the rest fade while the
     focus is on, and come back as soon as it is let go, while the focus is
     still on its way home. */
  let selected = $state<ReadonlySet<string>>(new Set());
  type Focus = { readonly ids: ReadonlySet<string>; readonly to: Positions };
  let focus = $state<Focus | null>(null);
  let focusing = $state(false);
  let mix = $state(0);
  let glide = 0;
  const GLIDE_MS = 520;
  const ease = (u: number): number => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const run = (to: number, done?: () => void): void => {
    cancelAnimationFrame(glide);
    const from = mix, t0 = performance.now();
    const step = (): void => {
      const u = Math.min(1, (performance.now() - t0) / GLIDE_MS);
      mix = from + (to - from) * ease(u);
      if (u < 1) glide = requestAnimationFrame(step); else done?.();
    };
    glide = requestAnimationFrame(step);
  };
  const toggleFocus = (): void => {
    if (focusing) { focusing = false; run(0, () => { focus = null; }); return; }
    if (!selected.size) return;
    const ids = connectedOf(edges, selected);
    focus = { ids, to: packed(pos, ids, selected, boxAt) };
    focusing = true; mix = 0; run(1);
  };
  /* Where a node is drawn: at home, at its packed place, or on its way between. */
  const at = (id: string): Pt | undefined => {
    const p = pos.get(id), q = focus?.to.get(id);
    return !p || !q || mix === 0 ? p : { x: p.x + (q.x - p.x) * mix, y: p.y + (q.y - p.y) * mix };
  };
  const faded = (id: string): boolean => focusing && !!focus && !focus.ids.has(id);
  const pick = (id: string, e: MouseEvent): void => {
    if (!(e.ctrlKey || e.metaKey)) { selected = new Set([id]); return; }
    selected = new Set(selected.has(id) ? [...selected].filter((x) => x !== id) : [...selected, id]);
  };

  /* The view: the transform d3-zoom holds, and the window of map coordinates it
     shows. The window is recomputed when a gesture ends, not on every frame, and
     carries a margin so that panning shows drawn nodes rather than holes. */
  let svgEl = $state<SVGSVGElement | null>(null);
  let tf = $state<ZoomTransform>(zoomIdentity);
  /* Nothing is drawn until the pane has been measured and the view fitted to it:
     a window of the whole plane would draw every node of the book at once. */
  let view = $state<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  let zoomer = $state.raw<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  /* How far in and out the wheel goes; the floor gives way to whatever fitting
     the whole map asks for, which a wide scope may need to be well under. */
  const MIN_SCALE = 0.15, MAX_SCALE = 2.5;
  /* Once the reader has walked a level it is theirs: a new size, or a new
     layout, no longer moves it under them, and it is kept for their return. */
  let walked = $state(false);
  const windowOf = (t: ZoomTransform): Rect => {
    const el = svgEl; if (!el) return view;
    const w = el.clientWidth / t.k, h = el.clientHeight / t.k;
    return { x: -t.x / t.k - w * 0.5, y: -t.y / t.k - h * 0.5, w: w * 2, h: h * 2 };
  };
  const settle = (t: ZoomTransform) => { view = windowOf(t); };
  const apply = (t: ZoomTransform): void => { const el = svgEl, z = zoomer; if (!el || !z) return; select(el).call(z.transform, t); settle(t); };

  /* The scale that fits the whole map in the pane as the pane really is. The
     floor on the wheel is what the map needs it to be, never a constant: a
     scope too wide to fit at the usual floor would otherwise be clamped there,
     and the reader would open on the crowded middle with the rest off screen. */
  const fitScale = (): number | null => {
    const el = svgEl, z = zoomer; if (!el || !z || !el.clientWidth || !el.clientHeight) return null;
    const k = Math.min(1, Math.min(el.clientWidth / extent.w, el.clientHeight / extent.h) || 1);
    z.scaleExtent([Math.min(MIN_SCALE, k * 0.9), MAX_SCALE]);
    return k;
  };
  /* A level as it opens: fitted and centred, or, when that would show more
     than a hundred concepts, centred at the scale that shows a hundred. */
  const opening = () => {
    const el = svgEl, fit = fitScale(); if (!el || fit === null) return;
    const w = el.clientWidth, h = el.clientHeight;
    const c: Pt = { x: extent.x + extent.w / 2, y: extent.y + extent.h / 2 };
    const pts = list.filter((n) => !visible || visible.has(n.id)).flatMap((n) => { const p = pos.get(n.id); return p ? [p] : []; });
    const k = Math.min(MAX_SCALE, Math.max(fit, crowdScale(pts, c, w, h) ?? fit));
    apply(zoomIdentity.translate(w / 2 - c.x * k, h / 2 - c.y * k).scale(k));
  };

  $effect(() => {
    const el = svgEl; if (!el) return;
    const z = d3zoom<SVGSVGElement, unknown>().scaleExtent([MIN_SCALE, MAX_SCALE])
      /* the background pans; a node keeps its own press, so dragging one out to a note still works, and Shift keeps the press for the lasso */
      .filter((e: MouseEvent) => e.type === 'wheel' || (!e.button && !e.shiftKey && !(e.target as Element | null)?.closest?.('.node')))
      .on('zoom', (e: { transform: ZoomTransform; sourceEvent: Event | null }) => { tf = e.transform; if (e.sourceEvent) { walked = true; close(); } })
      .on('end', (e: { transform: ZoomTransform }) => { settle(e.transform); if (walked) mapViews.keep(viewKey, e.transform); });
    zoomer = z;
    select(el).call(z).on('dblclick.zoom', null);
    /* the pane is the map's own size, and a pane that changes size reopens the level until the reader has walked it */
    const ro = new ResizeObserver(() => { if (walked) settle(tf); else opening(); });
    ro.observe(el);
    return () => { ro.disconnect(); select(el).on('.zoom', null); zoomer = null; };
  });
  /* Arriving at a level: where the reader left it, else as it opens. The
     selection and any focus belong to the level left behind. */
  $effect(() => {
    const k = viewKey; if (!svgEl || !zoomer) return;
    untrack(() => {
      cancelAnimationFrame(glide); selected = new Set(); focus = null; focusing = false; mix = 0;
      const had = mapViews.get(k);
      walked = !!had;
      if (!had) { opening(); return; }
      fitScale(); apply(zoomIdentity.translate(had.x, had.y).scale(had.k));
    });
  });
  /* a new layout — the settled places arriving, or a pane measured at last — opens the level again until it has been walked */
  $effect(() => { extent; svgEl; if (!walked) untrack(opening); });

  /* Walking to a node: a short glide of the view rather than a jump. */
  const goTo = (id: string, k = 1) => {
    const el = svgEl, p = at(id); if (!el || !p || !zoomer) return;
    walked = true;
    const to = zoomIdentity.translate(el.clientWidth / 2 - p.x * k, el.clientHeight / 2 - p.y * k).scale(k);
    const from = tf, t0 = performance.now(), dur = 420;
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / dur), e = ease(u);
      const t = zoomIdentity.translate(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e).scale(from.k + (to.k - from.k) * e);
      select(el).call(zoomer!.transform, t);
      if (u < 1) requestAnimationFrame(step); else settle(t);
    };
    requestAnimationFrame(step);
  };

  /* ---------- presses on a node ----------

     Every node carries `data-concept`, so its card follows the reader's setting
     like any other card, except that where cards open on click a node's opens
     on a double-click, the single click being the selection's. A middle click
     goes to where the concept is introduced, in a group beside. A press that
     travelled was a drag and selects nothing. */
  const SLOP = 4;
  let press: { id: string; x: number; y: number } | null = null;
  const close = () => { open = null; };
  const down = (id: string, e: PointerEvent) => { press = { id, x: e.clientX, y: e.clientY }; };
  const tapped = (id: string, e: MouseEvent): boolean => {
    const p = press; press = null;
    return !p || p.id !== id || Math.hypot(e.clientX - p.x, e.clientY - p.y) <= SLOP;
  };
  const click = async (id: string, e: MouseEvent) => {
    if (!tapped(id, e)) return;
    pick(id, e);
    if (settings.cardOpen === 'click' || node(id).status === 'placeholder') return;
    /* with cards on hover the press put the card away; it is asked for again */
    const el = e.currentTarget as HTMLElement;
    await tick();
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: e.clientX, clientY: e.clientY }));
  };
  /* Another section's node opens its section, or the book's own page where nothing of it is built yet. */
  const openPlaceholder = (id: string, e: MouseEvent): void => {
    const c = node(id), ref = sectionRef(book, sectionId(c.section)), entry = registry.entry(ref);
    if (entry?.built) { void openSectionFromView(ref, openingInView(e)); return; }
    window.open(entry?.openstax ?? registry.manifest(book).openstax, '_blank', 'noopener');
  };
  const dblclick = (id: string, e: MouseEvent): void => {
    if (node(id).status === 'placeholder') { openPlaceholder(id, e); return; }
    open = id;
    if (pin.pinned !== id) pin.toggle(conceptId(id));
  };
  const middle = (id: string, e: MouseEvent): void => {
    if (e.button !== 1) return;
    if (node(id).status === 'placeholder') { openPlaceholder(id, e); return; }
    void goConceptFromView(book, conceptId(id), 'new');
  };
  /* Escape and a press anywhere else let the card go; the card layer closes
     itself on the same two, and this keeps the map's own reading of it in step. */
  const outside = (e: PointerEvent) => {
    const t = e.target;
    if (t instanceof Element && (t.closest('.node') || t.closest('.hover-card'))) return;
    close();
  };
  const keyed = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };

  /* ---------- the lasso ----------

     A Shift-drag on the background, in the pane's own pixels while it is drawn
     and in the map's when it is let go; Ctrl or Cmd as well adds to what is
     held. A press on the background that does not travel lets the selection go. */
  type Lasso = { readonly from: Pt; readonly to: Pt; readonly add: boolean };
  let lasso = $state<Lasso | null>(null);
  let swallow = false;
  const local = (e: PointerEvent): Pt => { const r = svgEl!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const rectOf = (a: Pt, b: Pt): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
  const lassoed = $derived(lasso ? rectOf(lasso.from, lasso.to) : null);
  const lassoDown = (e: PointerEvent): void => {
    if (!e.shiftKey || e.button !== 0 || (e.target as Element).closest('.node')) return;
    svgEl!.setPointerCapture(e.pointerId);
    const p = local(e); lasso = { from: p, to: p, add: e.ctrlKey || e.metaKey };
  };
  const lassoMove = (e: PointerEvent): void => { if (lasso) lasso = { ...lasso, to: local(e) }; };
  const lassoUp = (): void => {
    const l = lasso; if (!l) return;
    lasso = null; swallow = true;
    const r = rectOf(l.from, l.to);
    const inMap: Rect = { x: (r.x - tf.x) / tf.k, y: (r.y - tf.y) / tf.k, w: r.w / tf.k, h: r.h / tf.k };
    const pool = list.map((c) => c.id).filter((id) => (!visible || visible.has(id)) && !faded(id));
    selected = new Set([...(l.add ? selected : []), ...touched(inMap, pool, at, boxAt)]);
  };
  const blank = (e: MouseEvent): void => {
    if (swallow) { swallow = false; return; }
    if ((e.target as Element).closest('.node')) return;
    selected = new Set();
  };

  /* The find box: the concepts of this map whose names carry what was typed. */
  let query = $state('');
  const plain = (s: string): string => s.replace(/\$[^$]*\$/g, ' ').replace(/[\\{}]/g, '').toLowerCase();
  const hits = $derived(query.trim().length < 2 ? [] : list.filter((c) => !hidden.has(c.kind) && !faded(c.id) && plain(c.name).includes(query.trim().toLowerCase())).slice(0, 8));
  const choose = (id: string) => { query = ''; hover = id; goTo(id); };

  /* The kinds the legend has switched off: their nodes and their edges are not drawn. */
  let hidden = $state<ReadonlySet<ConceptKind>>(new Set());
  const toggleKind = (k: ConceptKind) => { const s = new Set(hidden); if (!s.delete(k)) s.add(k); hidden = s; };
  const visible = $derived(hidden.size ? new Set(list.filter((c) => !hidden.has(c.kind)).map((c) => c.id)) : null);

  /* What the window holds: every node whose home lies in it, and while a focus
     is drawn, every node of the focus whose packed place does. */
  const focusGrid = $derived(focus ? gridOf(focus.to) : null);
  const shown = $derived.by(() => {
    const home = idsIn(grid, pos, view);
    const ids = focus && focusGrid ? [...home, ...idsIn(focusGrid, focus.to, view)] : home;
    return new Set(visible ? ids.filter((id) => visible.has(id)) : ids);
  });
  const drawn = $derived(list.filter((c) => shown.has(c.id)));
  const count = $derived(focusing && focus ? { drawn: drawn.filter((c) => focus!.ids.has(c.id)).length, of: focus.ids.size } : { drawn: drawn.length, of: list.length });
  /* A whole book fitted to the pane is put on the map a few hundred nodes a
     frame, so that opening it never holds the page still. The count only
     grows: a view that holds no more nodes than were placed draws at once. */
  const NODES_PER_FRAME = 120;
  let placing = $state(NODES_PER_FRAME);
  $effect(() => {
    if (placing >= drawn.length) return;
    const f = requestAnimationFrame(() => { placing += NODES_PER_FRAME; });
    return () => cancelAnimationFrame(f);
  });
  const placed = $derived(drawn.length <= placing ? drawn : drawn.slice(0, placing));
  type Wire = { readonly from: string; readonly to: string; readonly d: string; readonly faded: boolean };
  const wires = $derived(edges.filter(([a, b]) => (shown.has(a) || shown.has(b)) && (!visible || (visible.has(a) && visible.has(b)))).flatMap(([from, to]): Wire[] => {
    const p = at(from), q = at(to);
    if (!p || !q) return [];
    return [{ from, to, faded: faded(from) || faded(to), d: `M${p.x},${p.y} Q${(p.x + q.x) / 2 + (q.y - p.y) * 0.08},${(p.y + q.y) / 2 - (q.x - p.x) * 0.08} ${q.x},${q.y}` }];
  }));
</script>

<svelte:window onpointerdown={outside} onkeydown={keyed} />

<!-- the wrench a skill carries, on the node and again in the legend that teaches it -->
{#snippet wrench()}
  <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
{/snippet}

<div class="map" class:dimmed={!!hover} data-book={book}>
  <svg bind:this={svgEl} role="presentation" onpointerdown={lassoDown} onpointermove={lassoMove} onpointerup={lassoUp} onpointercancel={lassoUp} onclick={blank}>
    <g transform="translate({tf.x},{tf.y}) scale({tf.k})">
      <g class="wires">
        {#each wires as p (p.from + '>' + p.to)}<path d={p.d} class:hot={lit?.has(p.from) && lit?.has(p.to)} class:faded={p.faded} />{/each}
      </g>
      {#each placed as c (c.id)}
        {@const b = boxAt(c.id)}
        {@const p = at(c.id)!}
        <foreignObject x={p.x - b.w / 2} y={p.y - b.h / 2} width={b.w} height={b.h} class:lit={!lit || lit.has(c.id)} class:faded={faded(c.id)}>
          <div class="slot">
            <button type="button" class="node k-{c.kind}" class:ext={c.ext} class:selected={selected.has(c.id)} class:pinned={pin.pinned === c.id} class:open={open === c.id} class:active={coverage?.introduces.includes(c.id)} class:active-weak={coverage?.uses.includes(c.id)} data-id={c.id} data-concept={c.status === 'placeholder' ? undefined : c.id} data-card-open="dblclick"
              use:dragout={{ kind: 'concept', book, section: c.section, id: c.id }} use:snug
              data-state={showProgress ? practice.stateOf(c.id) : undefined} data-half={showProgress && share(c.id) >= 0.5 ? '1' : undefined} data-practicable={showProgress && (practicable[c.id] ?? 0) > 0 ? '1' : undefined} style:--m={showProgress ? share(c.id) : undefined}
              onpointerdown={(e) => down(c.id, e)} onclick={(e) => click(c.id, e)} ondblclick={(e) => dblclick(c.id, e)} onauxclick={(e) => middle(c.id, e)}
              onmouseenter={() => (hover = c.id)} onfocus={() => (hover = c.id)} onmouseleave={() => (hover = null)} onblur={() => (hover = null)}>
              <span class="name">{#if c.kind === 'skill'}{@render wrench()}{/if}<span use:mathHtml={c.name}></span></span>{#if c.ext}<small class="sec">{c.section}</small>{/if}
            </button>
          </div>
        </foreignObject>
      {/each}
    </g>
  </svg>
  {#if lassoed}<div class="lasso" style:left="{lassoed.x}px" style:top="{lassoed.y}px" style:width="{lassoed.w}px" style:height="{lassoed.h}px"></div>{/if}

  <!-- the legend and the find box stand over the map rather than above it -->
  <div class="hud">
    <div class="legend">
      {#each KINDS as k (k)}
        <button type="button" class="kind k-{k}" class:off={hidden.has(k)} aria-pressed={!hidden.has(k)} onclick={() => toggleKind(k)}><i class="sw">{#if k === 'skill'}{@render wrench()}{/if}</i>{k}</button>
      {/each}
      <span class="ext"><i class="sw"></i>other section</span>
    </div>
    <div class="legend tools">
      <label class="prog" title="Show mastery on each node"><input type="checkbox" checked={showProgress} onchange={(e) => (showProgress = e.currentTarget.checked)}>progress</label>
      <button type="button" class="focus" aria-pressed={focusing} disabled={!focusing && !selected.size} onclick={toggleFocus}>{focusing ? 'Unfocus' : 'Focus'}</button>
    </div>
  </div>
  <div class="find">
    <input type="search" placeholder="Find a concept" bind:value={query} aria-label="Find a concept on the map" data-find data-nodrag>
    {#if hits.length}
      <ul class="hits">
        {#each hits as h (h.id)}<li><button type="button" data-hit={h.id} onclick={() => choose(h.id)}><span use:mathHtml={h.name}></span><small>{h.section}</small></button></li>{/each}
      </ul>
    {/if}
  </div>
  <div class="readout" data-count="{count.drawn}/{count.of}" data-source={settled.source}>
    {#if laying}laying out {list.length} concepts…{:else}{count.drawn} of {count.of} drawn{#if settled.ms}{' · laid out in '}{settled.ms} ms{/if}{/if}
  </div>
</div>

<style>
  /* one hue per kind, mixed into the panel so the tint stays a second cue behind the shape */
  .map{
    --f-definition:color-mix(in srgb,var(--cm-definition) 10%,var(--panel)); --l-definition:color-mix(in srgb,var(--cm-definition) 45%,var(--rule));
    --f-axiom:color-mix(in srgb,var(--cm-axiom) 12%,var(--panel)); --l-axiom:color-mix(in srgb,var(--cm-axiom) 60%,var(--rule));
    --f-idea:color-mix(in srgb,var(--cm-idea) 14%,var(--panel)); --l-idea:color-mix(in srgb,var(--cm-idea) 45%,var(--rule));
    --f-result:color-mix(in srgb,var(--cm-result) 12%,var(--panel)); --l-result:color-mix(in srgb,var(--cm-result) 55%,var(--rule));
    --f-skill:color-mix(in srgb,var(--cm-skill) 12%,var(--panel)); --l-skill:color-mix(in srgb,var(--cm-skill) 50%,var(--rule));
  }
  /* the map is a window on a plane larger than itself, not a block that grows */
  .map{position:relative;height:min(70vh,640px);border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:var(--panel)}
  .map > svg{width:100%;height:100%;display:block;cursor:grab;touch-action:none;user-select:none}
  .map > svg:active{cursor:grabbing}
  /* The room a node was kept is its slot; the node stands in the middle of it as
     large as its name, never larger than the room, and the type is set in the
     map's own pixels, the size the layout read the names at. */
  foreignObject{overflow:visible}
  .slot{display:flex;align-items:center;justify-content:center;width:100%;height:100%;pointer-events:none}
  .node{position:relative;pointer-events:auto;width:max-content;max-width:100%;box-sizing:border-box;font:inherit;font-size:12px;line-height:15px;padding:5px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer;text-align:center}
  .node :global(.katex){font-size:0.95em}
  /* a definition is a plain box: a single rule round a name */
  .node.k-definition{background:var(--f-definition);border-color:var(--l-definition)}
  /* an axiom stands on a heavy rule down its left edge: what the book takes as given */
  .node.k-axiom{background:var(--f-axiom);border-color:var(--l-axiom);border-left:4px solid var(--l-axiom);border-radius:2px;font-weight:600}
  /* an idea is a soft box with no rule */
  .node.k-idea{background:var(--f-idea);border-color:transparent;border-radius:10px}
  /* a result wears the double rule a book prints round a law it has just derived; the rule grows inward, so the box keeps its size */
  .node.k-result{border:3px double var(--l-result);background:var(--f-result);font-weight:600}
  /* a skill carries a wrench: something to do rather than something to know */
  .node.k-skill{background:var(--f-skill);border-color:var(--l-skill);font-style:italic}
  .glyph{width:10px;height:10px;margin-right:4px;vertical-align:-1px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .node small.sec{display:block;font-size:9px;line-height:12px;color:var(--muted);font-weight:400;font-style:normal}
  /* the dashed rule is kept for what another section teaches: the shape holds, the line thins and breaks */
  .node.ext{border-style:dashed;border-width:1px;border-color:var(--rule);color:var(--muted);background:transparent}
  /* the reading states sit on top of every kind */
  .node.active{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent)}
  .node.active-weak{border-color:var(--muted)}
  .node.pinned{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel))}
  /* a selected node wears the accent's rule, which a focus gathers round */
  .node.selected{border-color:var(--accent);outline:2px solid color-mix(in srgb,var(--accent) 55%,transparent);outline-offset:1px}
  /* the node whose card is open wears the ring the card hangs from */
  .node.open{box-shadow:0 0 0 2px var(--accent)}
  .node:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  /* The practice cue, inside the node and never on its fill or its rule: a bar
     as long as the evidence stands towards mastery. Its colours are
     the app's own, so the kind hues go on saying only what the node is. */
  .node::after{content:"";position:absolute;left:6px;bottom:2px;height:3px;width:calc(var(--m,0) * (100% - 12px));border-radius:2px;background:var(--m-colour);pointer-events:none}
  /* The colours of the mastery box, which is how the practice is drawn
     everywhere the reader meets it: a concept begun is low until its evidence
     is halfway to mastery and middling after it, and a mastered one is high. */
  .node[data-state="practised"]{--m-colour:var(--m-low)}
  .node[data-state="practised"][data-half]{--m-colour:var(--m-mid)}
  .node[data-state="mastered"]{--m-colour:var(--m-high)}
  /* a concept there are exercises for and no evidence yet starts on the shortest low bar */
  .node[data-state="untouched"][data-practicable]{--m-colour:var(--m-low)}
  .node[data-state="untouched"][data-practicable]::after{width:8px}
  /* nothing is drawn for a concept with nothing to practise it by, nor for another section's work: this map is not where that stands */
  .node[data-state="untouched"]:not([data-practicable])::after,.node.ext::after,.node.ext::before{content:none}
  /* hovering names a neighbourhood: one class flip, and the rest of the map steps back */
  .map.dimmed foreignObject{opacity:0.25;transition:opacity .12s}
  .map.dimmed foreignObject.lit{opacity:1}
  .wires path{fill:none;stroke:var(--rule);stroke-width:1.5;opacity:0.7}
  .map.dimmed .wires path{opacity:0.15}
  .wires path.hot{stroke:var(--accent);opacity:1;stroke-width:2}
  /* what a focus leaves out fades, and takes no presses while it is gone */
  foreignObject,.wires path{transition:opacity .35s}
  .map foreignObject.faded,.map.dimmed foreignObject.faded,.map .wires path.faded{opacity:0;pointer-events:none}
  .lasso{position:absolute;pointer-events:none;border:1px solid var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);border-radius:2px}
  /* how much of the map is on screen, for a reader wondering what is being culled */
  .readout{position:absolute;right:8px;bottom:6px;font-size:0.65rem;color:var(--muted);pointer-events:none}
  /* the chrome floats in the corners of the map, on a wash of the panel so it reads over the nodes */
  .hud{position:absolute;top:8px;left:10px;z-index:2;display:flex;flex-direction:column;gap:2px;align-items:flex-start;max-width:calc(100% - 200px)}
  .hud > *{background:color-mix(in srgb,var(--panel) 82%,transparent);border-radius:5px;padding:2px 6px}
  /* the legend draws the shapes in miniature, so the convention is taught where it is used */
  .legend{display:flex;flex-wrap:wrap;align-items:center;gap:5px 12px;margin:0;font-size:0.7rem;color:var(--muted)}
  .legend span{display:inline-flex;align-items:center;gap:5px}
  /* each kind is a switch: pressed it draws its nodes, released it leaves them off */
  .legend .kind{display:inline-flex;align-items:center;gap:5px;font:inherit;color:inherit;padding:0;border:0;background:none;cursor:pointer}
  .legend .kind.off{opacity:0.45;text-decoration:line-through}
  .legend .kind:focus-visible{outline:2px solid var(--accent);outline-offset:1px;border-radius:3px}
  .legend .sw{display:inline-grid;place-items:center;width:20px;height:13px;flex:none;border:1px solid var(--rule);border-radius:3px;background:var(--panel)}
  .legend .glyph{width:9px;height:9px;margin:0;color:var(--ink)}
  .legend .k-definition .sw{background:var(--f-definition);border-color:var(--l-definition)}
  .legend .k-axiom .sw{background:var(--f-axiom);border-color:var(--l-axiom);border-left:4px solid var(--l-axiom);border-radius:1px}
  .legend .k-idea .sw{background:var(--f-idea);border-color:transparent;border-radius:5px}
  .legend .k-result .sw{border:3px double var(--l-result);background:var(--f-result)}
  .legend .k-skill .sw{background:var(--f-skill);border-color:var(--l-skill)}
  .legend .ext .sw{border-style:dashed;background:transparent}
  /* the second row holds the map's own switches: the practice bars, the size of a swatch, and the focus */
  .legend.tools .prog{display:inline-flex;align-items:center;gap:5px;cursor:pointer;user-select:none}
  .legend.tools .prog input{appearance:none;flex:none;width:22px;height:13px;margin:0;border:1px solid var(--rule);border-radius:7px;background:var(--panel);position:relative;cursor:pointer}
  .legend.tools .prog input::after{content:"";position:absolute;top:2px;left:2px;width:7px;height:7px;border-radius:50%;background:var(--muted);transition:left .15s}
  .legend.tools .prog input:checked{background:color-mix(in srgb,var(--accent) 22%,var(--panel));border-color:color-mix(in srgb,var(--accent) 50%,var(--rule))}
  .legend.tools .prog input:checked::after{left:11px;background:var(--accent)}
  .legend.tools .prog input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .legend.tools .focus{font:inherit;color:var(--ink);padding:0 7px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);cursor:pointer}
  .legend.tools .focus[aria-pressed="true"]{border-color:var(--accent);color:var(--accent)}
  .legend.tools .focus:disabled{color:var(--muted);cursor:default;opacity:0.6}
  .legend.tools .focus:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  /* the find box walks the view to a concept by name; its hits hang under it */
  .find{position:absolute;top:8px;right:10px;z-index:2}
  .find input{font:inherit;font-size:0.7rem;padding:2px 6px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--ink);width:140px}
  .find .hits{position:absolute;z-index:3;top:100%;right:0;margin:2px 0 0;padding:2px;list-style:none;min-width:180px;max-width:260px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);box-shadow:0 4px 14px rgb(0 0 0 / 0.18)}
  .find .hits button{display:block;width:100%;text-align:left;font:inherit;font-size:0.72rem;padding:3px 6px;border:0;border-radius:3px;background:transparent;color:var(--ink);cursor:pointer}
  .find .hits button:hover,.find .hits button:focus-visible{background:color-mix(in srgb,var(--accent) 14%,transparent)}
  .find .hits small{display:block;color:var(--muted);font-size:0.62rem}

  /* ---------- the map as a page of its own ----------
     A tab given to the map is the map: no column, no margins and no scroll, the
     trail that says where the view stands floating in the top corner with the
     rest of the chrome. */
  :global(.pane:has(> .view-pane[data-view="concepts"])){overflow:hidden}
  :global(.pane > .view-pane[data-view="concepts"]){max-width:none;margin:0;padding:0;height:100%}
  :global(.pane > .view-pane[data-view="concepts"] > .view){position:relative;height:100%}
  :global(.pane > .view-pane[data-view="concepts"] > .view > .scope){position:absolute;z-index:4;top:8px;left:10px;right:10px;margin:0;padding:2px 6px;border-radius:5px;background:color-mix(in srgb,var(--panel) 82%,transparent)}
  :global(.pane > .view-pane[data-view="concepts"]) .map{height:100%;border:0;border-radius:0}
  :global(.pane > .view-pane[data-view="concepts"]) .hud{top:34px}
  :global(.pane > .view-pane[data-view="concepts"]) .find{top:34px}
  :global(.view-pane) .legend{font-size:0.78rem;gap:6px 14px}
  :global(.view-pane) .legend .sw{width:24px;height:15px}
    :global(.view-pane) .legend .glyph{width:10px;height:10px}
</style>
