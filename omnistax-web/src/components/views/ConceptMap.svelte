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
     where the view stands float in its corners rather than standing above it,
     and the opening view is fitted to the real pane, refitted while the reader
     has not yet zoomed and left alone once they have.

     Hovering a node lights its edges and neighbours and steps the rest of the
     map back: that is all hovering does. A click opens the node's goto card —
     why the concept matters, and where the text introduces it, uses it and
     tests it, each a link to go there — and pins the concept; a click outside,
     Escape, a click on another node or a second click on the same one closes it
     again. A press that travels is a drag, not a click, so a node dragged onto
     a note still stands there as a card of its own.

     Nothing of the layout is computed while the page is held. The build settles
     every scope the reader can stand at and writes the places into layout.json,
     which is fetched the first time a map draws; a node set the build did not
     foresee is settled in a worker, with the seed rings drawn meanwhile.

     A node's shape says what kind of thing it is, the way a textbook page does:
     an idea is a plain box (a term to hold), a result is a box under a double
     rule (the boxed law at the end of a derivation), a skill is a pill carrying
     a wrench (something to do rather than something to know). Colour only
     seconds the shape, and the dashed rule is kept for another section's work.
     How the reader stands on a concept is a second reading drawn inside the node
     rather than a change of its shape or its hue: a thin bar along the bottom
     edge, as long as the concept's discrete evidence stands towards mastery,
     in the three colours the mastery box wears everywhere else — low
     for a concept begun, middling once its evidence is halfway to mastery, high
     for one mastered. A switch at the end of the states
     legend takes that second reading away again, for a reader who wants the map
     as a map; it belongs to this map alone, and opens the way the setting
     "Progress on the concept map" says.

     The concepts and the prerequisites between them are the build agent's
     reading of the book rather than anything the book prints, so the legend
     wears the one AI mark the rest of the app wears. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { practice } from '../../lib/practice/store.svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { getContext as getCtx, onDestroy, tick } from 'svelte';
  import type { Target } from '../../lib/sections/scope';
  import { pin } from '../../lib/sections/concepts.svelte';
  import { spy } from '../../lib/sections/spy.svelte';
  import { openDoc } from '../../lib/sections/nav.svelte';
  import { scopedNodes, edgesOf } from '../../lib/sections/dag';
  import { boxOf, extentOf, gridOf, idsIn, keyOf, layoutNodes, placesFor, seedPositions, type Positions, type Rect } from '../../lib/sections/forcelayout';
  import { loadLayouts, positionsOf, type LayoutFileDTO } from '../../lib/sections/layouts';
  import type { LayoutReply, LayoutRequest } from '../../lib/sections/layout.worker';
  import { conceptId, sectionId } from '../../lib/types/ids';
  import { mathHtml } from '../actions/math';
  import { dragout } from '../../lib/notes/md/dragout';
  import AiMark from '../ui/AiMark.svelte';
  import { select } from 'd3-selection';
  import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  const scoped = getCtx<() => Target>('scope');
  const list = $derived(scopedNodes(registry.concepts, scoped(), registry.manifest));
  const edges = $derived(edgesOf(list));
  const byId = $derived(new Map(list.map((c) => [c.id, c])));
  const node = (id: string) => byId.get(id)!;
  const coverage = $derived(spy.current.span ? registry.coverage.find((c) => c.span === spy.current.span) ?? registry.coverage.find((c) => c.span === spy.current.section) : undefined);
  let hover = $state<string | null>(null);   /* the node under the pointer, which lights its edges and its neighbours */
  /* The node whose card is open. Only that node carries `data-concept`, which is
     what the shell's card layer opens for, so hovering any other node says
     nothing and the card is the click's alone. */
  let open = $state<string | null>(null);
  /* Whether this map draws the practice bars. It starts where the setting says
     and is this map's own from then on: another map, or this one opened again,
     starts from the setting afresh. */
  let showProgress = $state(settings.mapProgress);
  /* How far the concept's discrete evidence stands towards mastery, 0 to 1. */
  const share = (id: string): number => practice.share(id);
  const boxes = $derived(new Map(list.map((c) => [c.id, boxOf(c)])));

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
    const url = registry.manifest.concepts;
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
  onDestroy(() => { worker?.terminate(); worker = null; });

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

  /* The view: the transform d3-zoom holds, and the window of map coordinates it
     shows. The window is recomputed when a gesture ends, not on every frame, and
     carries a margin so that panning shows drawn nodes rather than holes. */
  let svgEl = $state<SVGSVGElement | null>(null);
  let tf = $state<ZoomTransform>(zoomIdentity);
  /* Nothing is drawn until the pane has been measured and the view fitted to it:
     a window of the whole plane would draw every node of the book at once. */
  let view = $state<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  let zoomer: ZoomBehavior<SVGSVGElement, unknown> | null = null;
  /* How far in and out the wheel goes; the floor gives way to whatever fitting
     the whole map asks for, which a wide scope may need to be well under. */
  const MIN_SCALE = 0.15, MAX_SCALE = 2.5;
  /* Once the reader has walked the map it is theirs: a new size, or a new
     layout, no longer moves it under them. */
  let walked = $state(false);
  const windowOf = (t: ZoomTransform): Rect => {
    const el = svgEl; if (!el) return view;
    const w = el.clientWidth / t.k, h = el.clientHeight / t.k;
    return { x: -t.x / t.k - w * 0.5, y: -t.y / t.k - h * 0.5, w: w * 2, h: h * 2 };
  };
  const settle = (t: ZoomTransform) => { view = windowOf(t); };

  /* The whole map in the pane as the pane really is, which is why it is measured
     rather than assumed: the view opens on the shape of the map before the
     reader walks it. */
  const fitAll = () => {
    const el = svgEl, z = zoomer; if (!el || !z || !el.clientWidth || !el.clientHeight) return;
    const k = Math.min(1, Math.min(el.clientWidth / extent.w, el.clientHeight / extent.h) || 1);
    /* The floor on the scale is what the map needs it to be, never a constant:
       a scope too wide to fit at the usual floor would otherwise be clamped
       there, and the reader would open on the crowded middle of the map with
       the rest of it off screen — which reads as a pile rather than a map. */
    z.scaleExtent([Math.min(MIN_SCALE, k * 0.9), MAX_SCALE]);
    const t = zoomIdentity.translate(el.clientWidth / 2 - (extent.x + extent.w / 2) * k, el.clientHeight / 2 - (extent.y + extent.h / 2) * k).scale(k);
    select(el).call(z.transform, t);
    settle(t);
  };

  $effect(() => {
    const el = svgEl; if (!el) return;
    const z = d3zoom<SVGSVGElement, unknown>().scaleExtent([MIN_SCALE, MAX_SCALE])
      /* the background pans; a node keeps its own press, so dragging one out to a note still works */
      .filter((e: Event) => e.type === 'wheel' || !(e.target as Element | null)?.closest?.('.node'))
      .on('zoom', (e: { transform: ZoomTransform; sourceEvent: Event | null }) => { tf = e.transform; if (e.sourceEvent) { walked = true; close(); } })
      .on('end', (e: { transform: ZoomTransform }) => settle(e.transform));
    zoomer = z;
    select(el).call(z).on('dblclick.zoom', null);
    /* the pane is the map's own size, and a pane that changes size refits until the reader has walked it */
    const ro = new ResizeObserver(() => { if (walked) settle(tf); else fitAll(); });
    ro.observe(el);
    return () => { ro.disconnect(); select(el).on('.zoom', null); zoomer = null; };
  });
  /* a new layout — another scope, or the settled places arriving — opens on the whole of it */
  $effect(() => { extent; svgEl; if (!walked) fitAll(); });

  /* Walking to a node: a short glide of the view rather than a jump, and the
     only thing on this map that is animated. */
  const goTo = (id: string, k = 1) => {
    const el = svgEl, p = pos.get(id); if (!el || !p || !zoomer) return;
    walked = true;
    const to = zoomIdentity.translate(el.clientWidth / 2 - p.x * k, el.clientHeight / 2 - p.y * k).scale(k);
    const from = tf, t0 = performance.now(), dur = 420;
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const t = zoomIdentity.translate(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e).scale(from.k + (to.k - from.k) * e);
      select(el).call(zoomer!.transform, t);
      if (u < 1) requestAnimationFrame(step); else settle(t);
    };
    requestAnimationFrame(step);
  };

  /* ---------- the card a click opens ----------

     The shell's card layer opens for anything carrying `data-concept`, so which
     node carries it is the whole of the gesture: the open one does and no other
     does, and the card is asked to open by the pointer entering the node it has
     just been given. A press that travelled was a drag and opens nothing. */
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
    const c = node(id);
    if (c.status === 'placeholder') {
      const entry = registry.entry(sectionId(c.section));
      if (entry?.built) { openDoc(sectionId(c.section), 'text'); return; }
      window.open(entry?.openstax ?? registry.manifest.openstax, '_blank', 'noopener');
      return;
    }
    if (open === id) { close(); if (pin.pinned === id) pin.toggle(conceptId(id)); return; }
    open = id;
    if (pin.pinned !== id) pin.toggle(conceptId(id));
    const el = e.currentTarget as HTMLElement;
    await tick();   /* the node carries data-concept only now, so the card layer can see it */
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: e.clientX, clientY: e.clientY }));
  };
  /* Escape and a press anywhere else let the card go; the card layer closes
     itself on the same two, and this keeps the map's own reading of it in step. */
  const outside = (e: PointerEvent) => {
    const t = e.target;
    if (t instanceof Element && (t.closest('.node') || t.closest('.hover-card'))) return;
    close();
  };
  const keyed = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };

  /* The find box: the concepts of this map whose names carry what was typed. */
  let query = $state('');
  const plain = (s: string): string => s.replace(/\$[^$]*\$/g, ' ').replace(/[\\{}]/g, '').toLowerCase();
  const hits = $derived(query.trim().length < 2 ? [] : list.filter((c) => plain(c.name).includes(query.trim().toLowerCase())).slice(0, 8));
  const choose = (id: string) => { query = ''; hover = id; goTo(id); };

  const shown = $derived(new Set(idsIn(grid, pos, view)));
  const drawn = $derived(list.filter((c) => shown.has(c.id)));
  const wires = $derived(edges.filter(([a, b]) => shown.has(a) || shown.has(b)).map(([from, to]) => {
    const p = pos.get(from), q = pos.get(to);
    if (!p || !q) return null;
    return { from, to, d: `M${p.x},${p.y} Q${(p.x + q.x) / 2 + (q.y - p.y) * 0.08},${(p.y + q.y) / 2 - (q.x - p.x) * 0.08} ${q.x},${q.y}` };
  }).filter((w): w is { from: string; to: string; d: string } => w !== null));
</script>

<svelte:window onpointerdown={outside} onkeydown={keyed} />

<!-- the wrench a skill carries, on the node and again in the legend that teaches it -->
{#snippet wrench()}
  <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
{/snippet}

<div class="map" class:dimmed={!!hover}>
  <svg bind:this={svgEl} role="presentation">
    <g transform="translate({tf.x},{tf.y}) scale({tf.k})">
      <g class="wires">
        {#each wires as p (p.from + '>' + p.to)}<path d={p.d} class:hot={lit?.has(p.from) && lit?.has(p.to)} />{/each}
      </g>
      {#each drawn as c (c.id)}
        {@const b = boxes.get(c.id)!}
        {@const p = pos.get(c.id)!}
        <foreignObject x={p.x - b.w / 2} y={p.y - b.h / 2} width={b.w} height={b.h} class:lit={!lit || lit.has(c.id)}>
          <button type="button" class="node k-{c.kind}" class:ext={c.ext} class:pinned={pin.pinned === c.id} class:open={open === c.id} class:active={coverage?.introduces.includes(c.id)} class:active-weak={coverage?.uses.includes(c.id)} data-id={c.id} data-concept={open === c.id ? c.id : undefined}
            use:dragout={{ kind: 'concept', section: c.section, id: c.id }}
            data-state={showProgress ? practice.stateOf(c.id) : undefined} data-half={showProgress && share(c.id) >= 0.5 ? '1' : undefined} style:--m={showProgress ? share(c.id) : undefined}
            onpointerdown={(e) => down(c.id, e)} onclick={(e) => click(c.id, e)}
            onmouseenter={() => (hover = c.id)} onfocus={() => (hover = c.id)} onmouseleave={() => (hover = null)} onblur={() => (hover = null)}>
            {#if c.kind === 'skill'}{@render wrench()}{/if}<span use:mathHtml={c.name}></span>{#if c.ext}<small class="sec">{c.section}</small>{/if}
          </button>
        </foreignObject>
      {/each}
    </g>
  </svg>

  <!-- the legend and the find box stand over the map rather than above it -->
  <div class="hud">
    <div class="legend">
      <span class="head">Concept map<AiMark /></span>
      <span class="k-idea"><i class="sw"></i>idea</span>
      <span class="k-result"><i class="sw"></i>result</span>
      <span class="k-skill"><i class="sw">{@render wrench()}</i>skill</span>
      <span class="ext"><i class="sw"></i>other section</span>
    </div>
    <!-- the same miniature again, for the bar the nodes carry: how the practice stands -->
    <div class="legend states">
      {#if showProgress}
        <span class="s-practised"><i class="sw"></i>practiced</span>
        <span class="s-half"><i class="sw"></i>halfway</span>
        <span class="s-mastered"><i class="sw"></i>mastered</span>
      {/if}
      <label class="prog" title="Draw how the practice stands on each node"><input type="checkbox" checked={showProgress} onchange={(e) => (showProgress = e.currentTarget.checked)}>progress</label>
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
  <div class="readout" data-count="{drawn.length}/{list.length}" data-source={settled.source}>
    {#if laying}laying out {list.length} concepts…{:else}{drawn.length} of {list.length} drawn{#if settled.ms}{' · laid out in '}{settled.ms} ms{/if}{/if}
  </div>
</div>

<style>
  /* one hue per kind, mixed into the panel so the tint stays a second cue behind the shape */
  .map{
    --f-idea:color-mix(in srgb,var(--cm-idea) 12%,var(--panel)); --l-idea:color-mix(in srgb,var(--cm-idea) 45%,var(--rule));
    --f-result:color-mix(in srgb,var(--cm-result) 12%,var(--panel)); --l-result:color-mix(in srgb,var(--cm-result) 55%,var(--rule));
    --f-skill:color-mix(in srgb,var(--cm-skill) 12%,var(--panel)); --l-skill:color-mix(in srgb,var(--cm-skill) 50%,var(--rule));
  }
  /* the map is a window on a plane larger than itself, not a block that grows */
  .map{position:relative;height:min(70vh,640px);border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:var(--panel)}
  .map > svg{width:100%;height:100%;display:block;cursor:grab;touch-action:none}
  .map > svg:active{cursor:grabbing}
  .node{position:relative;width:100%;height:100%;box-sizing:border-box;font:inherit;font-size:0.78rem;line-height:1.15;padding:5px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer;text-align:center;overflow:hidden}
  .node :global(.katex){font-size:0.95em}
  /* an idea is a plain box: a single rule round a term */
  .node.k-idea{background:var(--f-idea);border-color:var(--l-idea)}
  /* a result wears the double rule a book prints round a law it has just derived; the rule grows inward, so the box keeps its size */
  .node.k-result{border:3px double var(--l-result);background:var(--f-result);font-weight:600}
  /* a skill is a pill with a wrench: something to do rather than something to know */
  .node.k-skill{border-radius:999px;background:var(--f-skill);border-color:var(--l-skill);font-style:italic}
  .glyph{width:10px;height:10px;margin-right:4px;vertical-align:-1px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .node small.sec{display:block;font-size:0.65rem;color:var(--muted);font-weight:400;font-style:normal}
  /* the dashed rule is kept for what another section teaches: the shape holds, the line thins and breaks */
  .node.ext{border-style:dashed;border-width:1px;border-color:var(--rule);color:var(--muted);background:transparent}
  /* the reading states sit on top of every kind */
  .node.active{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent)}
  .node.active-weak{border-color:var(--muted)}
  .node.pinned{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel))}
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
  /* a skill's pill is round-ended, so its bar keeps further clear */
  .node.k-skill::after{left:10px;width:calc(var(--m,0) * (100% - 20px))}
  /* nothing is drawn for a concept never practised, nor for another section's work: this map is not where that stands */
  .node[data-state="untouched"]::after,.node.ext::after,.node.ext::before{content:none}
  /* hovering names a neighbourhood: one class flip, and the rest of the map steps back */
  .map.dimmed foreignObject{opacity:0.25;transition:opacity .12s}
  .map.dimmed foreignObject.lit{opacity:1}
  .wires path{fill:none;stroke:var(--rule);stroke-width:1.5;opacity:0.7}
  .map.dimmed .wires path{opacity:0.15}
  .wires path.hot{stroke:var(--accent);opacity:1;stroke-width:2}
  /* how much of the map is on screen, for a reader wondering what is being culled */
  .readout{position:absolute;right:8px;bottom:6px;font-size:0.65rem;color:var(--muted);pointer-events:none}
  /* the chrome floats in the corners of the map, on a wash of the panel so it reads over the nodes */
  .hud{position:absolute;top:8px;left:10px;z-index:2;display:flex;flex-direction:column;gap:2px;align-items:flex-start;max-width:calc(100% - 200px)}
  .hud > *{background:color-mix(in srgb,var(--panel) 82%,transparent);border-radius:5px;padding:2px 6px}
  /* the legend draws the four shapes in miniature, so the convention is taught where it is used */
  .legend{display:flex;flex-wrap:wrap;align-items:center;gap:5px 12px;margin:0;font-size:0.7rem;color:var(--muted)}
  .legend .head{font-weight:600;color:var(--ink)}
  .legend span{display:inline-flex;align-items:center;gap:5px}
  .legend .sw{display:inline-grid;place-items:center;width:20px;height:13px;flex:none;border:1px solid var(--rule);border-radius:3px;background:var(--panel)}
  .legend .glyph{width:9px;height:9px;margin:0;color:var(--ink)}
  .legend .k-idea .sw{background:var(--f-idea);border-color:var(--l-idea)}
  .legend .k-result .sw{border:3px double var(--l-result);background:var(--f-result)}
  .legend .k-skill .sw{width:22px;border-radius:999px;background:var(--f-skill);border-color:var(--l-skill)}
  .legend .ext .sw{border-style:dashed;background:transparent}
  /* the second row teaches the bar in the same miniature, at three lengths */
  .legend.states .sw{position:relative}
  .legend.states .sw::after{content:"";position:absolute;left:3px;bottom:2px;height:2px;border-radius:1px;width:calc(var(--m) * (100% - 6px));background:var(--m-colour)}
  .legend.states .s-practised{--m:0.3;--m-colour:var(--m-low)}
  .legend.states .s-half{--m:0.7;--m-colour:var(--m-mid)}
  .legend.states .s-mastered{--m:1;--m-colour:var(--m-high)}
  /* the switch sits at the end of the same row, the size of a swatch */
  .legend.states .prog{display:inline-flex;align-items:center;gap:5px;cursor:pointer;user-select:none}
  .legend.states .prog input{appearance:none;flex:none;width:22px;height:13px;margin:0;border:1px solid var(--rule);border-radius:7px;background:var(--panel);position:relative;cursor:pointer}
  .legend.states .prog input::after{content:"";position:absolute;top:2px;left:2px;width:7px;height:7px;border-radius:50%;background:var(--muted);transition:left .15s}
  .legend.states .prog input:checked{background:color-mix(in srgb,var(--accent) 22%,var(--panel));border-color:color-mix(in srgb,var(--accent) 50%,var(--rule))}
  .legend.states .prog input:checked::after{left:11px;background:var(--accent)}
  .legend.states .prog input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
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
  :global(.view-pane) .legend .k-skill .sw{width:26px}
  :global(.view-pane) .legend .glyph{width:10px;height:10px}
</style>
