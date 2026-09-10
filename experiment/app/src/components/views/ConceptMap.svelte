<script lang="ts">
  /* The concept map: nodes in rows by prerequisite depth, edges drawn in an SVG
     behind them. Hover opens the node's goto card — why the concept matters,
     and where the text introduces it, uses it and tests it, each a link to go
     there; click pins it and jumps to where the text introduces it. What it
     draws is what the view's level covers: one section, one chapter, or
     everything the book teaches.

     A node's shape says what kind of thing it is, the way a textbook page does:
     an idea is a plain box (a term to hold), a result is a box under a double
     rule (the boxed law at the end of a derivation), a skill is a pill carrying
     a wrench (something to do rather than something to know). Colour only
     seconds the shape, and the dashed rule is kept for another section's work. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { getContext as getCtx } from 'svelte';
  import type { Target } from '../../lib/sections/scope';
  import { pin, spansOf } from '../../lib/sections/concepts.svelte';
  import { spy } from '../../lib/sections/spy.svelte';
  import { goSpan, openDoc } from '../../lib/sections/nav.svelte';
  import { scopedNodes, dagRows, edgesOf } from '../../lib/sections/dag';
  import { conceptId, sectionId } from '../../lib/types/ids';
  import { mathHtml } from '../actions/math';
  const scoped = getCtx<() => Target>('scope');
  const list = $derived(scopedNodes(registry.concepts, scoped(), registry.manifest));
  const rows = $derived(dagRows(list));
  const edges = $derived(edgesOf(list));
  const node = (id: string) => list.find((c) => c.id === id)!;
  const coverage = $derived(spy.current.span ? registry.coverage.find((c) => c.span === spy.current.span) ?? registry.coverage.find((c) => c.span === spy.current.section) : undefined);
  let hover = $state<string | null>(null);   /* the node under the pointer, which lights its edges; the card itself is the shell's */
  const click = (id: string) => {
    const c = node(id);
    if (c.placeholder) { const e = registry.entry(sectionId(c.section)); if (e?.built) { openDoc(sectionId(c.section), 'text'); return; } window.open(e?.openstax ?? registry.manifest.openstax, '_blank', 'noopener'); return; }
    const was = pin.pinned === id; pin.toggle(conceptId(id));
    const sp = spansOf(conceptId(id)); const t = sp.intro[0] ?? sp.uses[0]; if (!was && t) goSpan(t);
  };
  /* edges follow the node boxes; relaid on resize and font load */
  let host = $state<HTMLElement | null>(null);
  let paths = $state<Array<{ d: string; from: string; to: string }>>([]);
  let box = $state({ w: 0, h: 0 });
  const layout = () => {
    if (!host) return; const R = host.getBoundingClientRect(); box = { w: R.width, h: R.height };
    paths = edges.flatMap(([from, to]) => {
      const a = host!.querySelector<HTMLElement>(`[data-id="${CSS.escape(from)}"]`)?.getBoundingClientRect(), b = host!.querySelector<HTMLElement>(`[data-id="${CSS.escape(to)}"]`)?.getBoundingClientRect();
      if (!a || !b) return [];
      const x1 = a.left + a.width / 2 - R.left, y1 = a.bottom - R.top, x2 = b.left + b.width / 2 - R.left, y2 = b.top - R.top;
      return [{ from, to, d: `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}` }];
    });
  };
  $effect(() => { rows; edges; if (!host) return; const ro = new ResizeObserver(layout); ro.observe(host); document.fonts?.ready.then(layout); const t = setTimeout(layout, 300); return () => { ro.disconnect(); clearTimeout(t); }; });
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
<div class="dag" bind:this={host}>
  <svg viewBox="0 0 {box.w} {box.h}">{#each paths as p}<path d={p.d} class:hot={hover === p.from || hover === p.to} />{/each}</svg>
  {#each rows as row}
    <div class="row" class:dense={row.length >= 3}>
      {#each row as id (id)}
        {@const c = node(id)}
        <button type="button" class="node k-{c.kind}" class:ext={c.ext} class:pinned={pin.pinned === id} class:active={coverage?.introduces.includes(id)} class:active-weak={coverage?.uses.includes(id)} data-id={id} data-concept={id}
          onclick={() => click(id)} onmouseenter={() => (hover = id)} onfocus={() => (hover = id)} onmouseleave={() => (hover = null)} onblur={() => (hover = null)}>
          {#if c.kind === 'skill'}{@render wrench()}{/if}<span use:mathHtml={c.name}></span>{#if c.ext}<small class="sec">{c.section}</small>{/if}
        </button>
      {/each}
    </div>
  {/each}
</div>

<style>
  /* one hue per kind, mixed into the panel so the tint stays a second cue behind the shape */
  .dag,.legend{
    --f-idea:color-mix(in srgb,var(--cm-idea) 12%,var(--panel)); --l-idea:color-mix(in srgb,var(--cm-idea) 45%,var(--rule));
    --f-result:color-mix(in srgb,var(--cm-result) 12%,var(--panel)); --l-result:color-mix(in srgb,var(--cm-result) 55%,var(--rule));
    --f-skill:color-mix(in srgb,var(--cm-skill) 12%,var(--panel)); --l-skill:color-mix(in srgb,var(--cm-skill) 50%,var(--rule));
  }
  .dag{position:relative}
  .row{display:flex;flex-wrap:wrap;justify-content:space-around;gap:8px 6px;margin-bottom:30px;position:relative;z-index:1}   /* a row of many prerequisites wraps rather than squeezes */
  .row:last-child{margin-bottom:0}
  .node{font:inherit;font-size:0.78rem;line-height:1.15;padding:5px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer;text-align:center;max-width:120px;min-width:0}
  .node :global(.katex){font-size:0.95em}
  /* an idea is a plain box: a single rule round a term */
  .node.k-idea{background:var(--f-idea);border-color:var(--l-idea)}
  /* a result wears the double rule a book prints round a law it has just derived; the rule grows inward, so the box keeps its size */
  .node.k-result{border:3px double var(--l-result);padding:3px 5px;background:var(--f-result);font-weight:600}
  /* a skill is a pill with a wrench: something to do rather than something to know */
  .node.k-skill{border-radius:999px;padding:5px 11px;background:var(--f-skill);border-color:var(--l-skill);font-style:italic}
  .glyph{width:10px;height:10px;margin-right:4px;vertical-align:-1px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .node small.sec{display:block;font-size:0.65rem;color:var(--muted);font-weight:400;font-style:normal}
  /* the dashed rule is kept for what another section teaches: the shape holds, the line thins and breaks */
  .node.ext{border-style:dashed;border-width:1px;border-color:var(--rule);padding:5px 7px;color:var(--muted);background:transparent}
  .node.k-skill.ext{padding:5px 11px}
  /* the reading states sit on top of every kind */
  .node.active{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent)}
  .node.active-weak{border-color:var(--muted)}
  .node.pinned{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel))}
  .node:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .row.dense{font-size:0.7rem}
  /* the edge sheet only: the node and legend glyphs are SVGs of their own */
  .dag > svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .dag > svg path{fill:none;stroke:var(--rule);stroke-width:1.5}
  .dag > svg path.hot{stroke:var(--muted)}
  /* the legend draws the four shapes in miniature, so the convention is taught where it is used */
  .legend{display:flex;flex-wrap:wrap;align-items:center;gap:5px 12px;margin:-4px 0 10px;font-size:0.7rem;color:var(--muted)}
  .legend span{display:inline-flex;align-items:center;gap:5px}
  .legend .sw{display:inline-grid;place-items:center;width:20px;height:13px;flex:none;border:1px solid var(--rule);border-radius:3px;background:var(--panel)}
  .legend .glyph{width:9px;height:9px;margin:0;color:var(--ink)}
  .legend .k-idea .sw{background:var(--f-idea);border-color:var(--l-idea)}
  .legend .k-result .sw{border:3px double var(--l-result);background:var(--f-result)}
  .legend .k-skill .sw{width:22px;border-radius:999px;background:var(--f-skill);border-color:var(--l-skill)}
  .legend .ext .sw{border-style:dashed;background:transparent}
  :global(.view-pane) .node{font-size:0.9rem;max-width:180px;padding:7px 10px}
  :global(.view-pane) .node.k-result{padding:5px 8px}
  :global(.view-pane) .node.k-skill,:global(.view-pane) .node.k-skill.ext{padding:7px 14px}
  :global(.view-pane) .glyph{width:12px;height:12px}
  :global(.view-pane) .row{margin-bottom:44px}
  :global(.view-pane) .legend{font-size:0.78rem;gap:6px 14px}
  :global(.view-pane) .legend .sw{width:24px;height:15px}
  :global(.view-pane) .legend .k-skill .sw{width:26px}
  :global(.view-pane) .legend .glyph{width:10px;height:10px}
</style>
