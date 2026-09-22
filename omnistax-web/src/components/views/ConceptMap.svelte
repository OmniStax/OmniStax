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

     Hovering a node opens its goto card — why the concept matters, and where
     the text introduces it, uses it and tests it, each a link to go there —
     and lights its edges and neighbours while the rest of the map dims; click
     pins it and jumps to where the text introduces it, and a node dragged onto
     a note stands there as a card of its own.

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
     "Progress on the concept map" says. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { practice } from '../../lib/practice/store.svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { getContext as getCtx } from 'svelte';
  import type { Target } from '../../lib/sections/scope';
  import { pin, spansOf } from '../../lib/sections/concepts.svelte';
  import { spy } from '../../lib/sections/spy.svelte';
  import { goSpan, openDoc } from '../../lib/sections/nav.svelte';
  import { scopedNodes, depthsOf, edgesOf, type DagNode } from '../../lib/sections/dag';
  import { layout, extentOf, gridOf, idsIn, type Positions, type Rect } from '../../lib/sections/forcelayout';
  import { conceptId, sectionId } from '../../lib/types/ids';
  import { mathHtml } from '../actions/math';
  import { dragout } from '../../lib/notes/md/dragout';
  import { select } from 'd3-selection';
  import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  const scoped = getCtx<() => Target>('scope');
  const list = $derived(scopedNodes(registry.concepts, scoped(), registry.manifest));
  const edges = $derived(edgesOf(list));
  const byId = $derived(new Map(list.map((c) => [c.id, c])));
  const node = (id: string) => byId.get(id)!;
  const coverage = $derived(spy.current.span ? registry.coverage.find((c) => c.span === spy.current.span) ?? registry.coverage.find((c) => c.span === spy.current.section) : undefined);
  let hover = $state<string | null>(null);   /* the node under the pointer, which lights its edges; the card itself is the shell's */
  /* Whether this map draws the practice bars. It starts where the setting says
     and is this map's own from then on: another map, or this one opened again,
     starts from the setting afresh. */
  let showProgress = $state(settings.mapProgress);
  /* How far the concept's discrete evidence stands towards mastery, 0 to 1. */
  const share = (id: string): number => practice.share(id);
  const click = (id: string) => {
    const c = node(id);
    if (c.status === 'placeholder') { const e = registry.entry(sectionId(c.section)); if (e?.built) { openDoc(sectionId(c.section), 'text'); return; } window.open(e?.openstax ?? registry.manifest.openstax, '_blank', 'noopener'); return; }
    const was = pin.pinned === id; pin.toggle(conceptId(id));
    const sp = spansOf(conceptId(id)); const t = sp.intro[0] ?? sp.uses[0]; if (!was && t) goSpan(t);
  };

  /* The box a node takes up, read off its name rather than measured: the layout
     has to know how much room to keep clear before anything is drawn. */
  const CHAR = 6.4, MAXW = 150;
  const boxOf = (c: DagNode): { w: number; h: number } => {
    const n = c.name.replace(/\$[^$]*\$/g, 'xxxx').length;
    const w = Math.min(MAXW, Math.max(62, n * CHAR + 18));
    const lines = Math.max(1, Math.ceil((n * CHAR) / (w - 16)));
    return { w, h: 16 + lines * 15 + (c.ext ? 12 : 0) };
  };
  const boxes = $derived(new Map(list.map((c) => [c.id, boxOf(c)])));

  /* Settled places, kept per level and node set so that coming back to a scope
     is instant; nothing of this outlives the session. */
  type Settled = { readonly pos: Positions; readonly ms: number };
  const cache = new Map<string, Settled>();
  const hashOf = (ids: readonly string[]): string => {
    let h = 2166136261;
    for (const s of [...ids].sort().join('\u0000')) { h ^= s.charCodeAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  };
  const settled = $derived.by((): Settled => {
    const key = `${registry.manifest.title}|${hashOf(list.map((c) => c.id))}`;
    const had = cache.get(key);
    if (had) return had;
    const t0 = performance.now();
    const depth = depthsOf(list);
    const pos = layout(list.map((c) => { const b = boxes.get(c.id)!; return { id: c.id, depth: depth.get(c.id) ?? 0, r: Math.hypot(b.w, b.h) / 2 }; }), edges);
    const out: Settled = { pos, ms: Math.round(performance.now() - t0) };
    cache.set(key, out);
    return out;
  });
  const pos = $derived(settled.pos);
  const ms = $derived(settled.ms);   /* how long this layout took, for the corner readout */
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
  let view = $state<Rect>({ x: -1e6, y: -1e6, w: 2e6, h: 2e6 });
  let zoomer: ZoomBehavior<SVGSVGElement, unknown> | null = null;
  const windowOf = (t: ZoomTransform): Rect => {
    const el = svgEl; if (!el) return view;
    const w = el.clientWidth / t.k, h = el.clientHeight / t.k;
    return { x: -t.x / t.k - w * 0.5, y: -t.y / t.k - h * 0.5, w: w * 2, h: h * 2 };
  };
  const settle = (t: ZoomTransform) => { view = windowOf(t); };
  const shown = $derived(new Set(idsIn(grid, pos, view)));
  const drawn = $derived(list.filter((c) => shown.has(c.id)));
  const wires = $derived(edges.filter(([a, b]) => shown.has(a) || shown.has(b)).map(([from, to]) => {
    const p = pos.get(from)!, q = pos.get(to)!;
    return { from, to, d: `M${p.x},${p.y} Q${(p.x + q.x) / 2 + (q.y - p.y) * 0.08},${(p.y + q.y) / 2 - (q.x - p.x) * 0.08} ${q.x},${q.y}` };
  }));

  $effect(() => {
    const el = svgEl; if (!el) return;
    const z = d3zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 2.5])
      /* the background pans; a node keeps its own press, so dragging one out to a note still works */
      .filter((e: Event) => e.type === 'wheel' || !(e.target as Element | null)?.closest?.('.node'))
      .on('zoom', (e: { transform: ZoomTransform }) => { tf = e.transform; })
      .on('end', (e: { transform: ZoomTransform }) => settle(e.transform));
    zoomer = z;
    select(el).call(z).on('dblclick.zoom', null);
    /* open on the whole map, so the reader sees its shape before walking it */
    const k = Math.min(1, Math.min(el.clientWidth / extent.w, el.clientHeight / extent.h) || 1);
    const start = zoomIdentity.translate(el.clientWidth / 2 - (extent.x + extent.w / 2) * k, el.clientHeight / 2 - (extent.y + extent.h / 2) * k).scale(k);
    select(el).call(z.transform, start);
    settle(start);
    return () => { select(el).on('.zoom', null); zoomer = null; };
  });

  /* Walking to a node: a short glide of the view rather than a jump, and the
     only thing on this map that is animated. */
  const goTo = (id: string, k = 1) => {
    const el = svgEl, p = pos.get(id); if (!el || !p || !zoomer) return;
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

  /* The find box: the concepts of this map whose names carry what was typed. */
  let query = $state('');
  const plain = (s: string): string => s.replace(/\$[^$]*\$/g, ' ').replace(/[\\{}]/g, '').toLowerCase();
  const hits = $derived(query.trim().length < 2 ? [] : list.filter((c) => plain(c.name).includes(query.trim().toLowerCase())).slice(0, 8));
  const choose = (id: string) => { query = ''; hover = id; goTo(id); };
</script>

<!-- the wrench a skill carries, on the node and again in the legend that teaches it -->
{#snippet wrench()}
  <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
{/snippet}

<div class="legend">
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
  <span class="find">
    <input type="search" placeholder="Find a concept" bind:value={query} aria-label="Find a concept on the map" data-find>
    {#if hits.length}
      <ul class="hits">
        {#each hits as h (h.id)}<li><button type="button" data-hit={h.id} onclick={() => choose(h.id)}><span use:mathHtml={h.name}></span><small>{h.section}</small></button></li>{/each}
      </ul>
    {/if}
  </span>
</div>
<div class="dag" class:dimmed={!!hover}>
  <svg bind:this={svgEl} role="presentation">
    <g transform="translate({tf.x},{tf.y}) scale({tf.k})">
      <g class="wires">
        {#each wires as p (p.from + '>' + p.to)}<path d={p.d} class:hot={lit?.has(p.from) && lit?.has(p.to)} />{/each}
      </g>
      {#each drawn as c (c.id)}
        {@const b = boxes.get(c.id)!}
        {@const p = pos.get(c.id)!}
        <foreignObject x={p.x - b.w / 2} y={p.y - b.h / 2} width={b.w} height={b.h} class:lit={!lit || lit.has(c.id)}>
          <button type="button" class="node k-{c.kind}" class:ext={c.ext} class:pinned={pin.pinned === c.id} class:active={coverage?.introduces.includes(c.id)} class:active-weak={coverage?.uses.includes(c.id)} data-id={c.id} data-concept={c.id}
            use:dragout={{ kind: 'concept', section: c.section, id: c.id }}
            data-state={showProgress ? practice.stateOf(c.id) : undefined} data-half={showProgress && share(c.id) >= 0.5 ? '1' : undefined} style:--m={showProgress ? share(c.id) : undefined}
            onclick={() => click(c.id)} onmouseenter={() => (hover = c.id)} onfocus={() => (hover = c.id)} onmouseleave={() => (hover = null)} onblur={() => (hover = null)}>
            {#if c.kind === 'skill'}{@render wrench()}{/if}<span use:mathHtml={c.name}></span>{#if c.ext}<small class="sec">{c.section}</small>{/if}
          </button>
        </foreignObject>
      {/each}
    </g>
  </svg>
  <div class="readout" data-count="{drawn.length}/{list.length}">{drawn.length} of {list.length} drawn · laid out in {ms} ms</div>
</div>

<style>
  /* one hue per kind, mixed into the panel so the tint stays a second cue behind the shape */
  .dag,.legend{
    --f-idea:color-mix(in srgb,var(--cm-idea) 12%,var(--panel)); --l-idea:color-mix(in srgb,var(--cm-idea) 45%,var(--rule));
    --f-result:color-mix(in srgb,var(--cm-result) 12%,var(--panel)); --l-result:color-mix(in srgb,var(--cm-result) 55%,var(--rule));
    --f-skill:color-mix(in srgb,var(--cm-skill) 12%,var(--panel)); --l-skill:color-mix(in srgb,var(--cm-skill) 50%,var(--rule));
  }
  /* the map is a window on a plane larger than itself, not a block that grows */
  .dag{position:relative;height:min(70vh,640px);border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:var(--panel)}
  .dag > svg{width:100%;height:100%;display:block;cursor:grab;touch-action:none}
  .dag > svg:active{cursor:grabbing}
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
  .dag.dimmed foreignObject{opacity:0.25;transition:opacity .12s}
  .dag.dimmed foreignObject.lit{opacity:1}
  .wires path{fill:none;stroke:var(--rule);stroke-width:1.5;opacity:0.7}
  .dag.dimmed .wires path{opacity:0.15}
  .wires path.hot{stroke:var(--accent);opacity:1;stroke-width:2}
  /* how much of the map is on screen, for a reader wondering what is being culled */
  .readout{position:absolute;right:8px;bottom:6px;font-size:0.65rem;color:var(--muted);pointer-events:none}
  /* the legend draws the four shapes in miniature, so the convention is taught where it is used */
  .legend{display:flex;flex-wrap:wrap;align-items:center;gap:5px 12px;margin:-4px 0 10px;font-size:0.7rem;color:var(--muted)}
  .legend span{display:inline-flex;align-items:center;gap:5px}
  .legend .sw{display:inline-grid;place-items:center;width:20px;height:13px;flex:none;border:1px solid var(--rule);border-radius:3px;background:var(--panel)}
  .legend .glyph{width:9px;height:9px;margin:0;color:var(--ink)}
  .legend .k-idea .sw{background:var(--f-idea);border-color:var(--l-idea)}
  .legend .k-result .sw{border:3px double var(--l-result);background:var(--f-result)}
  .legend .k-skill .sw{width:22px;border-radius:999px;background:var(--f-skill);border-color:var(--l-skill)}
  .legend .ext .sw{border-style:dashed;background:transparent}
  /* the second row teaches the bar in the same miniature, at three lengths */
  .legend.states{margin-top:-6px}
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
  .legend .find{position:relative;margin-left:auto}
  .find input{font:inherit;font-size:0.7rem;padding:2px 6px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--ink);width:140px}
  .find .hits{position:absolute;z-index:3;top:100%;right:0;margin:2px 0 0;padding:2px;list-style:none;min-width:180px;max-width:260px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);box-shadow:0 4px 14px rgb(0 0 0 / 0.18)}
  .find .hits button{display:block;width:100%;text-align:left;font:inherit;font-size:0.72rem;padding:3px 6px;border:0;border-radius:3px;background:transparent;color:var(--ink);cursor:pointer}
  .find .hits button:hover,.find .hits button:focus-visible{background:color-mix(in srgb,var(--accent) 14%,transparent)}
  .find .hits small{display:block;color:var(--muted);font-size:0.62rem}
  :global(.view-pane) .dag{height:min(80vh,820px)}
  :global(.view-pane) .legend{font-size:0.78rem;gap:6px 14px}
  :global(.view-pane) .legend .sw{width:24px;height:15px}
  :global(.view-pane) .legend .k-skill .sw{width:26px}
  :global(.view-pane) .legend .glyph{width:10px;height:10px}
</style>
