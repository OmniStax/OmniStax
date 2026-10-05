<script lang="ts">
  /* The concept map: what the book teaches, each concept below what it rests on.
     Three layouts share one button group: Sugiyama top-down (the default), the
     same run left to right, and the hyperbolic tree in the Poincaré disk, where
     the concept in the middle is large and the rest of the book shrinks towards
     the rim. In the two layered layouts the reader drags the background to walk
     the map and the wheel comes closer; in the disk a drag slides the plane
     under the pointer, a click on a concept glides it to the middle, and the
     wheel grows the disk. The find box walks the view to a concept by name.

     The map is the whole pane. The toolbar, the legend, the find box and the
     trail that says where the view stands float in its corners. A level opens
     fitted and centred, or, when it holds more than a hundred concepts, centred
     at the scale that shows a hundred; it is refitted while the reader has not
     yet walked it. Each level keeps where the reader left it while they step
     between levels along the trail.

     Hovering a node lights its edges and neighbours and steps the rest back. A
     click selects a node, Ctrl- or Cmd-click adds it or takes it out, a
     Shift-drag anywhere draws a lasso (the lasso button makes a plain drag do
     it, and Escape puts the button back and lets the selection go), and a click
     on the background lets the selection go. Focus lays out the selection,
     every prerequisite of it and every concept built on it on their own, glides
     them there and lets the rest fade; Unfocus glides them home. The goto card
     opens on hover, or on a double-click where cards open on click; a
     double-click also pins the concept, and opens another section's node in its
     section. A press that travels is a drag, not a click, so a node dragged
     onto a note lands there as a card of its own.

     The default layout of every scope comes from layout.json, which the build
     settles, so the first paint waits on no layout; the other two, a focus, and
     a scope the build did not foresee are laid out in a worker (or here, when
     small) and kept for the session.

     A node is plain SVG, a rect and its name, measured once per name on a
     canvas; every press, hover and key is read off the one svg by the node's
     `data-id`. A node's shape says what kind of thing it is: a definition is a
     plain box, an axiom stands on a heavy rule down its left edge, a result
     wears a double rule, an idea is a soft box with no rule, and a skill carries
     a wrench. Colour only seconds the shape, and the dashed rule is kept for
     another section's work. Each kind in the legend is a switch that takes its
     nodes off the map. How the reader stands on a concept is a thin bar along
     the bottom edge, as long as its evidence stands towards mastery, in the
     mastery box's colours; the Progress button takes it away again, and opens
     the way the setting "Progress on the concept map" says. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { availabilityOf } from '../../lib/practice/model';
  import { settings } from '../../lib/settings/store.svelte';
  import { flushSync, getContext as getCtx, onDestroy, tick, untrack } from 'svelte';
  import type { Target } from '../../lib/sections/scope';
  import { pin, goConceptFromView } from '../../lib/sections/concepts.svelte';
  import { spy } from '../../lib/sections/spy.svelte';
  import { openSectionFromView, openingInView } from '../../lib/sections/nav.svelte';
  import { scopedNodes, edgesOf, type DagNode } from '../../lib/sections/dag';
  import { edgeKey, wireOf, type Box, type Laid, type Pt } from '../../lib/sections/sugiyama';
  import { abs2, apply, centring, dragged, geodesic, IDENTITY, positionsFrom, reanchored, ROOT, type Mobius } from '../../lib/sections/hyperbolic';
  import { boxOf, extentOf, keyOf, laidOf, laidOut, loadLayouts, sessionLayouts, wiresOf, MAXW, MINW, NODE_FONT, NODE_LINE, PAD_X, PAD_Y, SEC_LINE, type LayoutFileDTO, type LayoutKey, type MapKind } from '../../lib/sections/layouts';
  import { alignedTo, connectedOf, crowdScale, mapViews, viewKeyOf } from '../../lib/sections/mapview';
  import type { LayoutReply, LayoutRequest } from '../../lib/sections/layout.worker';
  import { inPolygon, type Vec } from '../../lib/drawer/geometry';
  import { conceptId, sectionId, sectionRef } from '../../lib/types/ids';
  import type { ConceptKind } from '../../lib/content/schema';
  import { KINDS } from '../../lib/sections/reference';
  import { ICON } from '../../lib/icons';
  import { figFor } from '../../lib/fig/figlib';
  import { dragout } from '../../lib/notes/md/dragout';
  import type { LinkTarget } from '../../lib/notes/md/links';
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
  /* A concept's name, set in its own book's TeX: only for the rare name with math in it. */
  const mathHtml = (el: HTMLElement, html: string) => {
    const write = (s: string): void => { el.innerHTML = s; figFor(book).renderMath(el); };
    write(html); return { update: write };
  };
  const plain = (s: string): string => s.replace(/\$[^$]*\$/g, ' ').replace(/[\\{}]/g, '');

  /* ---------- a node's label, measured once per name ---------- */
  type Label = Box & { readonly lines: readonly string[]; readonly math: boolean };
  const SKILL_ICON = 14;
  let svgEl = $state<SVGSVGElement | null>(null);
  let fontsIn = $state(0);
  const labels = new Map<string, Label>();
  let ink: CanvasRenderingContext2D | null = null, family = '';
  $effect(() => { let live = true; void document.fonts?.ready.then(() => { if (live) { labels.clear(); ink = null; fontsIn += 1; } }); return () => { live = false; }; });
  const labelOf = (c: DagNode): Label => {
    void fontsIn;
    const k = `${c.kind}|${c.ext ? 1 : 0}|${c.name}`, had = labels.get(k); if (had) return had;
    const ext = c.ext ? SEC_LINE : 0;
    if (c.name.includes('$') || typeof document === 'undefined') { const b = boxOf(c); const l = { ...b, lines: [], math: true }; labels.set(k, l); return l; }
    if (!ink) { ink = document.createElement('canvas').getContext('2d'); family = getComputedStyle(svgEl ?? document.body).fontFamily; }
    const skill = c.kind === 'skill' ? SKILL_ICON : 0;
    ink!.font = `${c.kind === 'skill' ? 'italic ' : ''}${c.kind === 'axiom' || c.kind === 'result' ? 600 : 400} ${NODE_FONT}px ${family}`;
    const room = MAXW - PAD_X - skill, width = (s: string): number => ink!.measureText(s).width;
    const lines = c.name.split(/\s+/).filter(Boolean).reduce<string[]>((acc, w) => {
      const last = acc[acc.length - 1];
      return last !== undefined && width(`${last} ${w}`) <= room ? [...acc.slice(0, -1), `${last} ${w}`] : [...acc, w];
    }, []);
    const l = { lines, math: false, w: Math.ceil(Math.max(MINW, Math.max(0, ...lines.map(width)) + PAD_X + skill)), h: PAD_Y + Math.max(1, lines.length) * NODE_LINE + ext };
    labels.set(k, l); return l;
  };
  const sizeOf = (id: string): Box => { const c = byId.get(id); return c ? labelOf(c) : { w: MINW, h: PAD_Y + NODE_LINE }; };

  let hover = $state<string | null>(null);
  /* The node whose card a double-click opened, whose concept is pinned. */
  let open = $state<string | null>(null);
  /* Whether this map draws the practice bars: it starts where the setting says and is this map's own from then on. */
  let showProgress = $state(settings.mapProgress);
  $effect(() => { if (showProgress) void books.load(book); });
  const practicable = $derived(showProgress ? availabilityOf(practice.catalog()) : {});

  /* ---------- where the nodes stand ---------- */
  type Source = 'build' | 'worker' | 'here';
  type Got = { readonly laid: Laid; readonly ms: number; readonly source: Source };
  type Home = Got & { readonly key: LayoutKey; readonly kind: MapKind };
  const MAIN_THREAD_MAX = 150;
  let kind = $state<MapKind>('down');
  let table = $state<LayoutFileDTO | null>(null);
  /* How long the map holds still for the build's file before laying out its own. */
  const FILE_GRACE_MS = 1200;
  let waited = $state(false);
  let home = $state.raw<Home | null>(null);

  $effect(() => {
    const url = registry.manifest(book).concepts;
    if (!url) { table = {}; return; }
    let live = true;
    loadLayouts(url).then((t) => { if (live) table = t; });
    const t = setTimeout(() => { if (live) waited = true; }, FILE_GRACE_MS);
    return () => { live = false; clearTimeout(t); };
  });

  /* One worker for this map, made the first time a layout needs it. */
  type Job = { readonly kind: MapKind; readonly nodes: LayoutRequest['nodes']; readonly edges: LayoutRequest['edges']; readonly done: ((g: Got) => void)[] };
  let worker: Worker | null = null;
  const jobs = new Map<LayoutKey, Job>();
  const kept = (key: LayoutKey, g: Got): Got => { sessionLayouts.set(key, g); return g; };
  const here = (key: LayoutKey, job: Omit<Job, 'done'>): Got => {
    const t0 = performance.now(), laid = laidOut(job.kind, job.nodes, job.edges);
    return kept(key, { laid, ms: Math.round(performance.now() - t0), source: 'here' });
  };
  const workerFor = (): Worker | null => {
    if (worker) return worker;
    try { worker = new Worker(new URL('../../lib/sections/layout.worker.ts', import.meta.url), { type: 'module' }); }
    catch { return null; }
    worker.onmessage = (e: MessageEvent<LayoutReply>) => {
      const r = e.data, job = jobs.get(r.key); jobs.delete(r.key);
      const laid: Laid = {
        pos: new Map(r.places.map(([id, x, y]) => [id, { x, y }])),
        bends: new Map(r.bends.map(([k, xs]) => [k, Array.from({ length: xs.length / 2 }, (_, i) => ({ x: xs[2 * i], y: xs[2 * i + 1] }))])),
        tree: r.tree && new Set(r.tree),
        steps: r.steps && new Map(r.steps.map(([id, p, x, y]) => [id, [p, x, y] as const])),
      };
      const g = kept(r.key, { laid, ms: r.ms, source: 'worker' });
      job?.done.forEach((f) => f(g));
    };
    /* a worker that fails hands its jobs to this thread */
    worker.onerror = () => { worker?.terminate(); worker = null; [...jobs].forEach(([k, j]) => { jobs.delete(k); const g = here(k, j); j.done.forEach((f) => f(g)); }); };
    return worker;
  };
  onDestroy(() => { worker?.terminate(); worker = null; cancelAnimationFrame(glide); cancelAnimationFrame(disking); });

  /* A layout of these concepts: this session's, the build's, the worker's, or this thread's. */
  const obtain = (k: MapKind, nodes: readonly DagNode[], file: LayoutFileDTO | null): Promise<Got> => {
    const key = keyOf(nodes, k);
    const had = sessionLayouts.get(key); if (had) return Promise.resolve(had);
    const built = file && k === 'down' ? laidOf(file, key) : null;
    if (built) return Promise.resolve(kept(key, { laid: built, ms: 0, source: 'build' }));
    const job = { kind: k, nodes: nodes.map((c) => ({ id: c.id, ...labelOf(c) })).map(({ id, w, h }) => ({ id, w, h })), edges: edgesOf(nodes) };
    const w = nodes.length > MAIN_THREAD_MAX ? workerFor() : null;
    if (!w) return Promise.resolve(here(key, job));
    return new Promise((done) => {
      const q = jobs.get(key); if (q) { q.done.push(done); return; }
      jobs.set(key, { ...job, done: [done] });
      w.postMessage({ key, ...job } satisfies LayoutRequest);
    });
  };

  /* The disk as it is drawn: the node it is anchored on, where every node stands seen from there, and the view. */
  type Disk = { readonly anchor: string; readonly pos: ReadonlyMap<string, Pt>; readonly view: Mobius };
  let homeDisk = $state.raw<Disk | null>(null), focusDisk = $state.raw<Disk | null>(null);

  $effect(() => {
    const k = kind, nodes = list, file = table, late = waited;
    const key = keyOf(nodes, k);
    if (untrack(() => home?.key) === key) return;
    const arrive = (g: Got): void => {
      home = { ...g, key, kind: k };
      if (k === 'disk') homeDisk = { anchor: ROOT, pos: g.laid.pos, view: IDENTITY };
    };
    const had = sessionLayouts.get(key);
    if (had || !nodes.length) { arrive(had ?? { laid: { pos: new Map(), bends: new Map() }, ms: 0, source: 'here' }); return; }
    home = null;
    if (k === 'down' && !file && !late) return;
    let live = true;
    void untrack(() => obtain(k, nodes, file)).then((g) => { if (live) arrive(g); });
    return () => { live = false; };
  });
  const laying = $derived(!home && list.length > 0);
  const pos = $derived(home?.laid.pos ?? new Map<string, Pt>());
  const extent = $derived(extentOf(pos));

  /* Which nodes each node touches, so a hover can light its neighbours. */
  const near = $derived.by(() => {
    const m = new Map<string, Set<string>>();
    edges.forEach(([a, b]) => { (m.get(a) ?? m.set(a, new Set()).get(a)!).add(b); (m.get(b) ?? m.set(b, new Set()).get(b)!).add(a); });
    return m;
  });

  /* ---------- the selection and the focus ----------
     A focus is the subgraph and its own layout. `mix` runs from 0, every node
     at home, to 1, the focus in its own places; the rest fade while the focus is
     on and come back as soon as it is let go. */
  let selected = $state<ReadonlySet<string>>(new Set());
  type Focus = { readonly ids: ReadonlySet<string>; readonly anchors: ReadonlySet<string>; readonly kind: MapKind | null; readonly to: Laid | null };
  let focus = $state.raw<Focus | null>(null);
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
    if (focusing) { focusing = false; run(0, () => { focus = null; focusDisk = null; }); return; }
    if (!selected.size) return;
    focus = { ids: connectedOf(edges, selected), anchors: selected, kind: null, to: null };
    focusing = true; mix = 0;
  };
  /* The focus laid out in the kind on screen, and glided into. */
  $effect(() => {
    const f = focus, k = kind, h = home;
    if (!f || !focusing || !h || h.kind !== k || f.kind === k) return;
    let live = true;
    const nodes = untrack(() => list.filter((c) => f.ids.has(c.id)));
    void obtain(k, nodes, null).then((g) => {
      if (!live || focus !== f) return;
      if (k === 'disk') {
        const a = [...f.anchors].find((id) => g.laid.pos.has(id)) ?? ROOT;
        focusDisk = { anchor: a, pos: g.laid.steps ? positionsFrom(g.laid.steps, a) : g.laid.pos, view: IDENTITY };
        focus = { ...f, kind: k, to: g.laid };
      } else focus = { ...f, kind: k, to: alignedTo(h.laid.pos, g.laid, f.anchors) };
      mix = 0; run(1);
    });
    return () => { live = false; };
  });
  const inFocus = (id: string): boolean => !!focus?.ids.has(id);
  const faded = (id: string): boolean => focusing && !!focus && !focus.ids.has(id);
  const pick = (id: string, e: MouseEvent | KeyboardEvent): void => {
    if (!(e.ctrlKey || e.metaKey)) { selected = new Set([id]); return; }
    selected = new Set(selected.has(id) ? [...selected].filter((x) => x !== id) : [...selected, id]);
  };

  /* ---------- the view ---------- */
  let tf = $state<ZoomTransform>(zoomIdentity);
  let pane = $state({ w: 0, h: 0 });
  let zoomer = $state.raw<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const MIN_SCALE = 0.15, MAX_SCALE = 2.5;
  /* Below this scale a name is a smudge, so the layered map draws its boxes alone and pans the faster for it. */
  const DISTANT = 0.4;
  /* Once the reader has walked a level it is theirs: a new size no longer moves it. */
  let walked = $state(false);
  const setView = (t: ZoomTransform): void => { const el = svgEl, z = zoomer; if (el && z) select(el).call(z.transform, t); };
  const fitScale = (): number | null => {
    const el = svgEl, z = zoomer; if (!el || !z || !el.clientWidth || !el.clientHeight) return null;
    const k = Math.min(1, Math.min(el.clientWidth / extent.w, el.clientHeight / extent.h) || 1);
    z.scaleExtent([Math.min(MIN_SCALE, k * 0.9), MAX_SCALE]);
    return k;
  };
  const opening = () => {
    const el = svgEl, fit = fitScale(); if (!el || fit === null || kind === 'disk') return;
    const w = el.clientWidth, h = el.clientHeight;
    const c: Pt = { x: extent.x + extent.w / 2, y: extent.y + extent.h / 2 };
    const pts = list.filter((n) => !hidden.has(n.kind)).flatMap((n) => { const p = pos.get(n.id); return p ? [p] : []; });
    const k = Math.min(MAX_SCALE, Math.max(fit, crowdScale(pts, c, w, h) ?? fit));
    setView(zoomIdentity.translate(w / 2 - c.x * k, h / 2 - c.y * k).scale(k));
  };

  $effect(() => {
    const el = svgEl; if (!el) return;
    const z = d3zoom<SVGSVGElement, unknown>().scaleExtent([MIN_SCALE, MAX_SCALE])
      /* the background pans; a node keeps its own press for the drag out, Shift and the lasso button keep it for the lasso, and the disk moves by its own rules */
      .filter((e: MouseEvent) => kind !== 'disk' && (e.type === 'wheel' || (!e.button && !e.shiftKey && !lassoMode && !(e.target as Element | null)?.closest?.('.node'))))
      .on('zoom', (e: { transform: ZoomTransform; sourceEvent: Event | null }) => { tf = e.transform; if (e.sourceEvent) { walked = true; close(); } })
      .on('end', (e: { transform: ZoomTransform }) => { if (walked) mapViews.keep(viewKey, e.transform); });
    zoomer = z;
    select(el).call(z).on('dblclick.zoom', null);
    const ro = new ResizeObserver(() => { pane = { w: el.clientWidth, h: el.clientHeight }; if (!walked) opening(); });
    ro.observe(el);
    return () => { ro.disconnect(); select(el).on('.zoom', null); zoomer = null; };
  });
  /* Arriving at a level: where the reader left it, else as it opens. The selection and any focus belong to the level left behind. */
  $effect(() => {
    const k = viewKey; if (!svgEl || !zoomer) return;
    untrack(() => {
      cancelAnimationFrame(glide); selected = new Set(); focus = null; focusDisk = null; focusing = false; mix = 0;
      const had = mapViews.get(k);
      walked = !!had;
      if (!had) { opening(); return; }
      fitScale(); setView(zoomIdentity.translate(had.x, had.y).scale(had.k));
    });
  });
  $effect(() => { extent; svgEl; if (!walked) untrack(opening); });

  const setKind = (k: MapKind): void => {
    if (k === kind) return;
    cancelAnimationFrame(glide); cancelAnimationFrame(disking); mix = 0; hover = null;
    if (focus && !focusing) focus = null; else if (focus) focus = { ...focus, kind: null, to: null };
    focusDisk = null; walked = false; kind = k;
  };

  /* ---------- the disk ---------- */
  let diskZoom = $state(1);
  const R = $derived((Math.min(pane.w, pane.h) / 2) * 0.92 * diskZoom);
  const centre = $derived({ x: pane.w / 2, y: pane.h / 2 });
  /* below this a disk node drops its name, and below the floor it is not drawn */
  const LABEL_MIN = 0.55, GONE = 0.015;
  const activeDisk = (): Disk | null => (focusing && focusDisk ? focusDisk : homeDisk);
  const steer = (d: Disk): void => { if (focusing && focusDisk) focusDisk = d; else homeDisk = d; };
  const stepsOf = (): Laid['steps'] => (focusing && focusDisk ? focus?.to?.steps : home?.laid.steps);
  const reanchor = (d: Disk, to: string): Disk => {
    const steps = stepsOf(); if (!steps || to === d.anchor) return d;
    return { anchor: to, pos: positionsFrom(steps, to), view: reanchored(steps, d.anchor, to, d.view) };
  };
  /* After a gesture the disk is anchored on the node nearest its middle, so that is where the numbers are exact. */
  const settleDisk = (): void => {
    const d = activeDisk(); if (!d) return;
    let best = d.anchor, least = Infinity;
    d.pos.forEach((z, id) => { const r = abs2(apply(d.view, z)); if (r < least) { least = r; best = id; } });
    steer(reanchor(d, best));
  };
  const onDisk = (d: Disk | null, id: string): (Pt & { s: number }) | undefined => {
    const z = d?.pos.get(id); if (!d || !z) return undefined;
    const w = apply(d.view, z);
    return { x: centre.x + R * w.x, y: centre.y + R * w.y, s: Math.max(0, 1 - abs2(w)) };
  };
  let disking = 0;
  const CENTRE_MS = 400;
  const centreOn = (id: string): void => {
    const d = activeDisk(), z = d?.pos.get(id); if (!d || !z) return;
    cancelAnimationFrame(disking);
    const w = apply(d.view, z), t0 = performance.now();
    const step = (): void => {
      const u = Math.min(1, (performance.now() - t0) / CENTRE_MS);
      const now = { ...d, view: centring(d.view, w, ease(u)) };
      if (u < 1) { steer(now); disking = requestAnimationFrame(step); } else steer(reanchor(now, id));
    };
    disking = requestAnimationFrame(step);
  };

  /* ---------- where a node is drawn ---------- */
  type Placed = Pt & { readonly s: number };
  const lerp = (p: Pt, q: Pt, u: number): Pt => ({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u });
  /* In the layered layouts: at home, in the focus's place, or on the way; a node outside the focus never reads `mix`. */
  const place = (id: string): Placed | undefined => {
    if (kind === 'disk') {
      const p = onDisk(homeDisk, id); if (!p || !inFocus(id) || !focusDisk) return p;
      const q = onDisk(focusDisk, id); if (!q) return p;
      return mix === 1 ? q : { ...lerp(p, q, mix), s: p.s + (q.s - p.s) * mix };
    }
    const p = pos.get(id); if (!p) return undefined;
    const q = focus?.to?.pos.get(id); if (!q) return { ...p, s: 1 };
    return mix === 0 ? { ...p, s: 1 } : { ...lerp(p, q, mix), s: 1 };
  };
  /* Where a node stands on the pane, for the lasso. */
  const onPane = (id: string): Pt | undefined => {
    const p = place(id); if (!p) return undefined;
    return kind === 'disk' ? p : { x: p.x * tf.k + tf.x, y: p.y * tf.k + tf.y };
  };

  /* The kinds the legend has switched off. */
  let hidden = $state<ReadonlySet<ConceptKind>>(new Set());
  const toggleKind = (k: ConceptKind) => { const s = new Set(hidden); if (!s.delete(k)) s.add(k); hidden = s; };
  const shown = $derived(hidden.size ? list.filter((c) => !hidden.has(c.kind)) : list);
  const shownIds = $derived(hidden.size ? new Set(shown.map((c) => c.id)) : null);
  /* A layout is put on the map a few hundred nodes a frame, those nearest the
     middle first, so what the opening view shows is drawn at once and the page
     never holds still for the rest. */
  const NODES_PER_FRAME = 250;
  let placing = $state(NODES_PER_FRAME);
  const order = $derived.by(() => {
    const h = home; if (!h) return [];
    const mid = h.kind === 'disk' ? { x: 0, y: 0 } : { x: extent.x + extent.w / 2, y: extent.y + extent.h / 2 };
    const far = (id: string): number => { const p = h.laid.pos.get(id); return p ? (p.x - mid.x) ** 2 + (p.y - mid.y) ** 2 : Infinity; };
    return untrack(() => list).map((c) => ({ c, d: far(c.id) })).sort((a, b) => a.d - b.d).map((x) => x.c);
  });
  $effect(() => { void home; placing = NODES_PER_FRAME; });
  $effect(() => {
    if (placing >= order.length) return;
    const f = requestAnimationFrame(() => { placing += NODES_PER_FRAME; });
    return () => cancelAnimationFrame(f);
  });
  const drawn = $derived(placing >= order.length ? shown : (() => { const ids = new Set(order.slice(0, placing).map((c) => c.id)); return shown.filter((c) => ids.has(c.id)); })());
  const drawnIds = $derived(placing >= order.length ? shownIds : new Set(drawn.map((c) => c.id)));
  type Wire = { readonly a: string; readonly b: string; readonly k: string };
  const wires = $derived(edges.filter(([a, b]) => !drawnIds || (drawnIds.has(a) && drawnIds.has(b))).map(([a, b]): Wire => ({ a, b, k: edgeKey(a, b) })));

  /* Every edge's path for a layout, computed when the layout arrives rather than as the view moves. */
  const homeWires = $derived(home && home.kind !== 'disk' ? wiresOf(home.laid, edges, sizeOf, home.kind) : null);
  const focusWires = $derived(focus?.to && focus.kind && focus.kind !== 'disk' ? wiresOf(focus.to, edges, sizeOf, focus.kind) : null);
  const both = (w: Wire): boolean => inFocus(w.a) && inFocus(w.b);
  /* A layered edge: its stored path, unless both its ends are gliding with a focus. */
  const layeredD = (w: Wire): string => {
    if (!both(w) || !focus?.to) return homeWires?.get(w.k) ?? '';
    if (mix === 0) return homeWires?.get(w.k) ?? '';
    if (mix === 1) return focusWires?.get(w.k) ?? '';
    const p = place(w.a), q = place(w.b); if (!p || !q) return '';
    return wireOf(p, sizeOf(w.a), q, sizeOf(w.b), [], kind === 'right');
  };
  const diskD = (w: Wire): string => {
    const d = both(w) && focusDisk && mix === 1 ? focusDisk : homeDisk;
    if (both(w) && focusDisk && mix > 0 && mix < 1) { const p = place(w.a), q = place(w.b); return p && q ? `M${p.x},${p.y}L${q.x},${q.y}` : ''; }
    const p = d?.pos.get(w.a), q = d?.pos.get(w.b); if (!d || !p || !q) return '';
    const u = apply(d.view, p), v = apply(d.view, q);
    return 1 - abs2(u) < GONE && 1 - abs2(v) < GONE ? '' : geodesic(u, v, R, centre);
  };
  const crossing = (w: Wire): boolean => {
    const t = (focusing && focus?.to?.tree) || home?.laid.tree;
    return !!t && !t.has(w.k);
  };

  /* Hovering lights the node, its neighbours and its edges: classes on those few, never a pass over the map. */
  let nodesEl = $state<SVGGElement | null>(null), wiresEl = $state<SVGGElement | null>(null);
  $effect(() => {
    const h = hover, ns = nodesEl, ws = wiresEl; if (!h || !ns || !ws) return;
    const ids = [h, ...(near.get(h) ?? [])];
    const lit = untrack(() => [
      ...ids.map((id) => ns.querySelector(`[data-id="${CSS.escape(id)}"]`)),
      ...wires.filter((w) => w.a === h || w.b === h).map((w) => ws.querySelector(`[data-k="${CSS.escape(w.k)}"]`)),
    ].filter((e): e is Element => !!e));
    lit.forEach((e) => e.classList.add('lit'));
    return () => lit.forEach((e) => e.classList.remove('lit'));
  });

  /* Walking to a node: a short glide of the view, or in the disk, the node glided to the middle. */
  const goTo = (id: string, k = 1) => {
    if (kind === 'disk') { centreOn(id); return; }
    const el = svgEl, p = place(id); if (!el || !p || !zoomer) return;
    walked = true;
    const to = zoomIdentity.translate(el.clientWidth / 2 - p.x * k, el.clientHeight / 2 - p.y * k).scale(k);
    const from = tf, t0 = performance.now(), dur = 420;
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / dur), e = ease(u);
      setView(zoomIdentity.translate(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e).scale(from.k + (to.k - from.k) * e));
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- presses ----------
     One set of handlers on the svg reads which node a press is on from its
     `data-id`. Every node carries `data-concept`, so its card follows the
     reader's setting like any other card, except that where cards open on click
     a node's opens on a double-click. A middle click goes to where the concept
     is introduced. A press that travelled was a drag and selects nothing. */
  const SLOP = 4;
  let press: { id: string; x: number; y: number } | null = null;
  let drag = $state.raw<LinkTarget>({ kind: 'note', name: '' } as LinkTarget);
  const close = () => { open = null; };
  const nodeOf = (t: EventTarget | null): SVGGElement | null => (t instanceof Element ? t.closest<SVGGElement>('.node') : null);
  const idOf = (t: EventTarget | null): string | null => nodeOf(t)?.dataset.id ?? null;
  const tapped = (id: string, e: MouseEvent): boolean => {
    const p = press; press = null;
    return !p || p.id !== id || Math.hypot(e.clientX - p.x, e.clientY - p.y) <= SLOP;
  };
  const clickNode = async (id: string, e: MouseEvent) => {
    if (!tapped(id, e)) return;
    pick(id, e);
    if (kind === 'disk') centreOn(id);
    if (settings.cardOpen === 'click' || node(id).status === 'placeholder') return;
    /* with cards on hover the press put the card away; it is asked for again */
    const el = nodeOf(e.target);
    await tick();
    el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: e.clientX, clientY: e.clientY }));
  };
  const openPlaceholder = (id: string, e: MouseEvent): void => {
    const c = node(id), ref = sectionRef(book, sectionId(c.section)), entry = registry.entry(ref);
    if (entry?.built) { void openSectionFromView(ref, openingInView(e)); return; }
    window.open(entry?.openstax ?? registry.manifest(book).openstax, '_blank', 'noopener');
  };
  const dblclick = (e: MouseEvent): void => {
    const id = idOf(e.target); if (!id) return;
    if (node(id).status === 'placeholder') { openPlaceholder(id, e); return; }
    open = id;
    if (pin.pinned !== id) pin.toggle(conceptId(id));
  };
  const middle = (e: MouseEvent): void => {
    const id = idOf(e.target); if (!id || e.button !== 1) return;
    if (node(id).status === 'placeholder') { openPlaceholder(id, e); return; }
    void goConceptFromView(book, conceptId(id), 'new');
  };
  const outside = (e: PointerEvent) => {
    const t = e.target;
    if (t instanceof Element && (t.closest('.node') || t.closest('.hover-card'))) return;
    close();
  };
  let mapEl = $state<HTMLElement | null>(null);
  const keyed = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    close();
    if (lassoMode || mapEl?.contains(document.activeElement)) { lassoMode = false; selected = new Set(); }
  };
  const nodeKey = (e: KeyboardEvent): void => {
    const id = idOf(e.target); if (!id || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); pick(id, e);
    if (kind === 'disk') centreOn(id);
  };

  /* ---------- the lasso and the disk's drag ----------
     A Shift-drag anywhere, or any drag with the lasso button down, draws a
     loop in the pane's own pixels and takes every node whose middle it holds;
     Ctrl or Cmd as well adds to what is held. In the disk a plain drag on the
     background slides the plane. A press on the background that does not travel
     lets the selection go. */
  let lassoMode = $state(false);
  let lasso = $state.raw<{ readonly pts: readonly Vec[]; readonly add: boolean } | null>(null);
  let slide: { from: Pt; moved: boolean } | null = null;
  let swallow = false;
  const local = (e: PointerEvent): Vec => { const r = svgEl!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const unit = (e: PointerEvent): Pt => { const [x, y] = local(e); return { x: (x - centre.x) / R, y: (y - centre.y) / R }; };
  const down = (e: PointerEvent): void => {
    const id = idOf(e.target);
    if (id) {
      press = { id, x: e.clientX, y: e.clientY };
      const c = node(id); drag = { kind: 'concept', book, section: c.section, id: c.id };
      flushSync();
    }
    if (e.button !== 0) return;
    if (e.shiftKey || (lassoMode && !id)) {
      svgEl!.setPointerCapture(e.pointerId);
      lasso = { pts: [local(e)], add: e.ctrlKey || e.metaKey };
      return;
    }
    if (kind === 'disk' && !id) { svgEl!.setPointerCapture(e.pointerId); cancelAnimationFrame(disking); slide = { from: unit(e), moved: false }; }
  };
  const move = (e: PointerEvent): void => {
    if (lasso) {
      const p = local(e), last = lasso.pts[lasso.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 3) lasso = { ...lasso, pts: [...lasso.pts, p] };
      return;
    }
    const d = activeDisk(); if (!slide || !d) return;
    const to = unit(e);
    steer({ ...d, view: dragged(d.view, slide.from, to) });
    slide = { from: to, moved: true }; close();
  };
  const up = (): void => {
    if (slide) { if (slide.moved) { swallow = true; settleDisk(); } slide = null; }
    const l = lasso; if (!l) return;
    lasso = null; swallow = true;
    const hit = l.pts.length < 3 ? [] : shown.map((c) => c.id).filter((id) => {
      if (faded(id)) return false;
      const p = onPane(id); return !!p && inPolygon(l.pts, p.x, p.y);
    });
    selected = new Set([...(l.add ? selected : []), ...hit]);
  };
  const clicked = (e: MouseEvent): void => {
    if (swallow) { swallow = false; return; }
    const id = idOf(e.target);
    if (id) void clickNode(id, e); else selected = new Set();
  };
  /* the wheel grows the disk; d3-zoom keeps it in the layered layouts */
  $effect(() => {
    const el = svgEl; if (!el) return;
    const wheel = (e: WheelEvent): void => {
      if (kind !== 'disk') return;
      e.preventDefault();
      diskZoom = Math.min(6, Math.max(0.5, diskZoom * Math.exp(-e.deltaY * 0.0015)));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });
  /* The drag out is the browser's own drag of the plane; a lasso or a slide is not one, and the picture carried is the node's name. */
  const dragStart = (e: DragEvent): void => {
    if (lasso || slide || !press) { e.preventDefault(); e.stopPropagation(); return; }
    const ghost = document.createElement('div');
    ghost.className = 'map-ghost'; ghost.textContent = plain(node(press.id).name);
    document.body.append(ghost);
    e.dataTransfer?.setDragImage(ghost, 10, 10);
    setTimeout(() => ghost.remove());
  };

  /* The find box: the concepts of this map whose names carry what was typed. */
  let query = $state('');
  const hits = $derived(query.trim().length < 2 ? [] : shown.filter((c) => !faded(c.id) && plain(c.name).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8));
  const choose = (id: string) => { query = ''; hover = id; goTo(id); };

  const count = $derived(focusing && focus ? focus.ids.size : shown.length);
  const LAYOUTS: readonly { readonly kind: MapKind; readonly label: string; readonly icon: string }[] = [
    { kind: 'down', label: 'Top-down layers', icon: ICON.layoutDown },
    { kind: 'right', label: 'Left-to-right layers', icon: ICON.layoutRight },
    { kind: 'disk', label: 'Hyperbolic disk', icon: ICON.hyperbolic },
  ];
  const RX: Record<ConceptKind, number> = { definition: 5, axiom: 2, result: 5, idea: 10, skill: 5 } as Record<ConceptKind, number>;
  const WRENCH = 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z';
</script>

<svelte:window onpointerdown={outside} onkeydown={keyed} />

<div class="map" class:dimmed={!!hover} class:distant={kind !== 'disk' && tf.k < DISTANT} class:focusing class:lassoing={lassoMode} class:disk={kind === 'disk'} data-book={book} bind:this={mapEl}>
  <div class="plane" use:dragout={drag} ondragstartcapture={dragStart}>
    <svg bind:this={svgEl} role="presentation" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onclick={clicked} ondblclick={dblclick} onauxclick={middle}
      onpointerover={(e) => (hover = idOf(e.target))} onpointerleave={() => (hover = null)} onfocusin={(e) => (hover = idOf(e.target))} onfocusout={() => (hover = null)} onkeydown={nodeKey}>
      <rect class="bg" width="100%" height="100%" data-nodrag />
      {#if kind === 'disk'}<circle class="rim" cx={centre.x} cy={centre.y} r={Math.max(0, R)} data-nodrag />{/if}
      <g transform={kind === 'disk' ? undefined : `translate(${tf.x},${tf.y}) scale(${tf.k})`}>
        <g class="wires" data-nodrag bind:this={wiresEl}>
          {#each wires as w (w.k)}<path d={kind === 'disk' ? diskD(w) : layeredD(w)} data-k={w.k} class:out={focusing && !both(w)} class:cross={kind === 'disk' && crossing(w)} />{/each}
        </g>
        <g bind:this={nodesEl}>
          {#each drawn as c (c.id)}
            {@const p = place(c.id)}
            {#if p && p.s > GONE}
              {@const l = labelOf(c)}
              {@const bar = showProgress && !c.ext && (practice.stateOf(c.id) !== 'untouched' || (practicable[c.id] ?? 0) > 0)}
              <g class="node k-{c.kind}" class:ext={c.ext} class:in={inFocus(c.id)} class:far={p.s < LABEL_MIN} class:selected={selected.has(c.id)} class:pinned={pin.pinned === c.id} class:open={open === c.id} class:active={coverage?.introduces.includes(c.id)} class:active-weak={coverage?.uses.includes(c.id)}
                transform="translate({p.x},{p.y}){p.s === 1 ? '' : ` scale(${p.s})`}" data-id={c.id} data-concept={c.status === 'placeholder' ? undefined : c.id} data-card-open="dblclick"
                data-state={bar ? practice.stateOf(c.id) : undefined} data-half={bar && practice.share(c.id) >= 0.5 ? '1' : undefined} tabindex="0" role="button" aria-label={plain(c.name)}>
                <rect class="box" x={-l.w / 2} y={-l.h / 2} width={l.w} height={l.h} rx={c.ext ? 5 : RX[c.kind]} />
                {#if !c.ext && c.kind === 'axiom'}<rect class="rule" x={-l.w / 2} y={-l.h / 2} width="4" height={l.h} />{/if}
                {#if !c.ext && c.kind === 'result'}<rect class="rule" x={-l.w / 2 + 2.5} y={-l.h / 2 + 2.5} width={l.w - 5} height={l.h - 5} rx="3" />{/if}
                {#if l.math}
                  <foreignObject x={-l.w / 2} y={-l.h / 2} width={l.w} height={l.h - (c.ext ? SEC_LINE : 0)}><div class="tex"><span use:mathHtml={c.name}></span></div></foreignObject>
                {:else}
                  {@const top = -l.h / 2 + PAD_Y / 2 + NODE_LINE / 2}
                  {@const shift = c.kind === 'skill' ? SKILL_ICON / 2 : 0}
                  {#if c.kind === 'skill'}<path class="wrench" d={WRENCH} transform="translate({-l.w / 2 + PAD_X / 2 - 1},{top - 5}) scale(0.42)" />{/if}
                  <text>{#each l.lines as line, i (i)}<tspan x={shift} y={top + i * NODE_LINE}>{line}</tspan>{/each}</text>
                {/if}
                {#if c.ext}<text class="sec" y={l.h / 2 - PAD_Y / 2 - 3}>{c.section}</text>{/if}
                {#if bar}<rect class="meter" x={-l.w / 2 + 6} y={l.h / 2 - 5} height="3" rx="1.5" width={practice.stateOf(c.id) === 'untouched' ? 8 : Math.max(0, (l.w - 12) * practice.share(c.id))} />{/if}
              </g>
            {/if}
          {/each}
        </g>
      </g>
      {#if lasso}<path class="lasso" d="M{lasso.pts.map((p) => p.join(',')).join('L')}Z" />{/if}
    </svg>
  </div>

  <!-- the toolbar and the legend stand over the map rather than above it -->
  <div class="hud" data-nodrag>
    <div class="tools" role="toolbar" aria-label="Concept map">
      {#each LAYOUTS as o (o.kind)}
        <button type="button" class="tool" title={o.label} aria-label={o.label} aria-pressed={kind === o.kind} onclick={() => setKind(o.kind)}>{@html o.icon}</button>
      {/each}
      <span class="sep" aria-hidden="true"></span>
      <button type="button" class="tool" title="Lasso (or Shift-drag)" aria-label="Lasso" aria-pressed={lassoMode} onclick={() => (lassoMode = !lassoMode)}>{@html ICON.lasso}</button>
      <button type="button" class="tool wide" title={focusing ? 'Unfocus' : 'Focus on the selection'} aria-pressed={focusing} disabled={!focusing && !selected.size} onclick={toggleFocus}>{@html ICON.focus}<span>{focusing ? 'Unfocus' : selected.size ? `Focus ${selected.size}` : 'Focus'}</span></button>
      <span class="sep" aria-hidden="true"></span>
      <button type="button" class="tool" title="Progress" aria-label="Progress" aria-pressed={showProgress} onclick={() => (showProgress = !showProgress)}>{@html ICON.progress}</button>
    </div>
    <div class="legend">
      {#each KINDS as k (k)}
        <button type="button" class="kind k-{k}" class:off={hidden.has(k)} aria-pressed={!hidden.has(k)} onclick={() => toggleKind(k)}><i class="sw">{#if k === 'skill'}<svg viewBox="0 0 24 24" aria-hidden="true"><path d={WRENCH} /></svg>{/if}</i>{k}</button>
      {/each}
      <span class="kind ext"><i class="sw"></i>other section</span>
    </div>
  </div>
  <div class="find" data-nodrag>
    <input type="search" placeholder="Find a concept" bind:value={query} aria-label="Find a concept on the map" data-find>
    {#if hits.length}
      <ul class="hits">
        {#each hits as h (h.id)}<li><button type="button" data-hit={h.id} onclick={() => choose(h.id)}><span use:mathHtml={h.name}></span><small>{h.section}</small></button></li>{/each}
      </ul>
    {/if}
  </div>
  <div class="readout" data-count={count} data-source={home?.source}>
    {#if laying}laying out {list.length} concepts…{:else}{count} concepts{#if home?.ms}{' · laid out in '}{home.ms} ms{/if}{/if}
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
  .map{position:relative;height:min(70vh,640px);border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:var(--panel)}
  .plane{position:absolute;inset:0}
  .plane > svg{width:100%;height:100%;display:block;cursor:grab;touch-action:none;user-select:none}
  .plane > svg:active{cursor:grabbing}
  .map.lassoing .plane > svg{cursor:crosshair}
  .bg{fill:transparent}
  .rim{fill:none;stroke:var(--rule);stroke-width:1}

  /* ---------- a node ---------- */
  .node{cursor:pointer;outline:none}
  .node .box{fill:var(--panel);stroke:var(--rule);stroke-width:1}
  .node text{font-size:12px;fill:var(--ink);text-anchor:middle;dominant-baseline:central;text-rendering:geometricPrecision;pointer-events:none}
  /* a definition is a plain box */
  .k-definition .box{fill:var(--f-definition);stroke:var(--l-definition)}
  /* an axiom stands on a heavy rule down its left edge */
  .k-axiom .box{fill:var(--f-axiom);stroke:var(--l-axiom)}
  .k-axiom .rule{fill:var(--l-axiom)}
  .k-axiom text,.k-result text{font-weight:600}
  /* an idea is a soft box with no rule */
  .k-idea .box{fill:var(--f-idea);stroke:none}
  /* a result wears the double rule a book prints round a law it has just derived */
  .k-result .box{fill:var(--f-result);stroke:var(--l-result)}
  .k-result .rule{fill:none;stroke:var(--l-result)}
  /* a skill carries a wrench */
  .k-skill .box{fill:var(--f-skill);stroke:var(--l-skill)}
  .k-skill text{font-style:italic}
  .wrench{fill:none;stroke:var(--ink);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
  .tex{display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;line-height:15px;color:var(--ink);text-align:center;pointer-events:none}
  .tex :global(.katex){font-size:0.95em}
  .node text.sec{font-size:9px;fill:var(--muted)}
  /* another section's work: the line thins and breaks */
  .node.ext .box{fill:transparent;stroke:var(--rule);stroke-dasharray:4 3}
  .node.ext text{fill:var(--muted)}
  /* the reading states sit on top of every kind */
  .node.active .box{stroke:var(--accent);stroke-width:2}
  .node.active-weak .box{stroke:var(--muted)}
  .node.pinned .box{stroke:var(--accent);fill:color-mix(in srgb,var(--accent) 12%,var(--panel))}
  .node.selected .box{stroke:var(--accent);stroke-width:2.5;stroke-dasharray:none}
  .node.open .box{stroke:var(--accent);stroke-width:3}
  .node:focus-visible .box{stroke:var(--accent);stroke-width:2.5;stroke-dasharray:none}
  /* the practice bar, in the mastery box's colours */
  .meter{fill:var(--m-low);pointer-events:none}
  .node[data-state="practised"][data-half] .meter{fill:var(--m-mid)}
  .node[data-state="mastered"] .meter{fill:var(--m-high)}
  /* in the disk a node near the rim, and on a layered map seen from far off, keeps its box and drops its name */
  .node.far text,.node.far .wrench,.node.far .meter,.map.distant .node text,.map.distant .node .wrench,.map.distant .node .tex{display:none}

  /* ---------- edges, the hover and the focus: one class on the map, and on the few nodes it names ---------- */
  /* paint alpha rather than opacity, which would cost every path a layer of its own */
  .wires path{fill:none;stroke:var(--rule);stroke-width:1.5;stroke-opacity:0.7}
  .wires path.cross{stroke-opacity:0.18}
  .map.distant .wires path,.map.distant .box{shape-rendering:optimizeSpeed}
  .map.dimmed .node:not(:global(.lit)){opacity:0.25}
  .map.dimmed .wires path{stroke-opacity:0.12}
  .map.dimmed .wires path:global(.lit){stroke:var(--accent);stroke-opacity:1;stroke-width:2}
  .map.focusing .node:not(.in),.map.focusing .wires path.out{visibility:hidden;pointer-events:none}
  .lasso{fill:color-mix(in srgb,var(--accent) 10%,transparent);stroke:var(--accent);stroke-width:1;stroke-dasharray:4 3;pointer-events:none}

  .readout{position:absolute;right:8px;bottom:6px;font-size:0.65rem;color:var(--muted);pointer-events:none}

  /* ---------- the toolbar ---------- */
  .hud{position:absolute;top:8px;left:10px;z-index:2;display:flex;flex-direction:column;gap:4px;align-items:flex-start;max-width:calc(100% - 200px)}
  .hud > *{background:color-mix(in srgb,var(--panel) 82%,transparent);border-radius:6px}
  .tools{display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--rule)}
  .tool{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:28px;height:28px;padding:0;border:0;border-radius:4px;background:none;color:var(--muted);font:inherit;font-size:0.72rem;cursor:pointer}
  .tool.wide{padding:0 7px 0 5px}
  .tool :global(svg){width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .tool:hover:not(:disabled){color:var(--ink);background:color-mix(in srgb,var(--ink) 6%,transparent)}
  .tool[aria-pressed="true"]{color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--panel))}
  .tool:disabled{opacity:0.45;cursor:default}
  .tool:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .sep{width:1px;height:18px;margin:0 3px;background:var(--rule)}
  /* the legend: one row of pills, each a switch that draws its kind or leaves it off */
  .legend{display:flex;flex-wrap:wrap;align-items:center;gap:3px;padding:2px;font-size:0.68rem;color:var(--muted)}
  .kind{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px 0 4px;font:inherit;color:inherit;border:1px solid var(--rule);border-radius:10px;background:var(--panel);cursor:pointer}
  span.kind{cursor:default}
  .kind.off{opacity:0.45;text-decoration:line-through}
  .kind:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .sw{display:inline-grid;place-items:center;width:16px;height:11px;flex:none;border:1px solid var(--rule);border-radius:3px;background:var(--panel)}
  .sw svg{width:8px;height:8px;fill:none;stroke:var(--ink);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
  .k-definition .sw{background:var(--f-definition);border-color:var(--l-definition)}
  .k-axiom .sw{background:var(--f-axiom);border-color:var(--l-axiom);border-left:3px solid var(--l-axiom);border-radius:1px}
  .k-idea .sw{background:var(--f-idea);border-color:transparent;border-radius:5px}
  .k-result .sw{border:3px double var(--l-result);background:var(--f-result)}
  .k-skill .sw{background:var(--f-skill);border-color:var(--l-skill)}
  .ext .sw{border-style:dashed;background:transparent}

  /* the find box walks the view to a concept by name; its hits hang under it */
  .find{position:absolute;top:8px;right:10px;z-index:2}
  .find input{font:inherit;font-size:0.7rem;padding:2px 6px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--ink);width:140px}
  .find .hits{position:absolute;z-index:3;top:100%;right:0;margin:2px 0 0;padding:2px;list-style:none;min-width:180px;max-width:260px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);box-shadow:0 4px 14px rgb(0 0 0 / 0.18)}
  .find .hits button{display:block;width:100%;text-align:left;font:inherit;font-size:0.72rem;padding:3px 6px;border:0;border-radius:3px;background:transparent;color:var(--ink);cursor:pointer}
  .find .hits button:hover,.find .hits button:focus-visible{background:color-mix(in srgb,var(--accent) 14%,transparent)}
  .find .hits small{display:block;color:var(--muted);font-size:0.62rem}
  /* the picture a node carries while it is dragged out to a note */
  :global(.map-ghost){position:fixed;top:-100px;left:0;padding:3px 8px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);font-size:12px}

  /* ---------- the map as a page of its own ---------- */
  :global(.pane:has(> .view-pane[data-view="concepts"])){overflow:hidden}
  :global(.pane > .view-pane[data-view="concepts"]){max-width:none;margin:0;padding:0;height:100%}
  :global(.pane > .view-pane[data-view="concepts"] > .view){position:relative;height:100%}
  :global(.pane > .view-pane[data-view="concepts"] > .view > .scope){position:absolute;z-index:4;top:8px;left:10px;right:10px;margin:0;padding:2px 6px;border-radius:5px;background:color-mix(in srgb,var(--panel) 82%,transparent)}
  :global(.pane > .view-pane[data-view="concepts"]) .map{height:100%;border:0;border-radius:0}
  :global(.pane > .view-pane[data-view="concepts"]) .hud{top:34px}
  :global(.pane > .view-pane[data-view="concepts"]) .find{top:34px}
</style>
