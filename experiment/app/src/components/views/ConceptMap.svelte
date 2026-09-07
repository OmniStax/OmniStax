<script lang="ts">
  /* The concept map: nodes in rows by prerequisite depth, edges drawn in an SVG
     behind them. Hover explains a node; click pins it and jumps to where the
     text introduces it. Scoped to the focused section, or the chapter as a tab. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { pin, spansOf, testedBy } from '../../lib/sections/concepts.svelte';
  import { spy } from '../../lib/sections/spy.svelte';
  import { goSpan, openDoc, findEl } from '../../lib/sections/nav.svelte';
  import { scopedNodes, dagRows, edgesOf } from '../../lib/sections/dag';
  import { conceptId, sectionId } from '../../lib/types/ids';
  import { math } from '../actions/math';
  let { chapterWide }: { chapterWide: boolean } = $props();
  const scope = $derived(chapterWide ? null : focus.section);
  const list = $derived(scopedNodes(registry.concepts, scope));
  const rows = $derived(dagRows(list));
  const edges = $derived(edgesOf(list));
  const node = (id: string) => list.find((c) => c.id === id)!;
  const coverage = $derived(spy.current.span ? registry.coverage.find((c) => c.span === spy.current.span) ?? registry.coverage.find((c) => c.span === spy.current.section) : undefined);
  const spanTitle = (id: string): string => { const h = findEl(id)?.querySelector('h2, h3'); if (!h) return id; const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove()); return c.textContent?.replace(/^Example [\d.]+ · /, '') ?? id; };
  let hover = $state<string | null>(null);
  const why = $derived.by(() => {
    if (!hover) return null; const c = node(hover); const sp = spansOf(conceptId(c.id)); const tb = testedBy(conceptId(c.id)).length;
    if (c.placeholder) return `<b>${c.name}.</b> <span class="kind">section ${c.section}, not built yet</span><br>Opens the OpenStax page.`;
    return `<b>${c.name}.</b> <span class="kind">${c.kind}${c.ext ? ' · section ' + c.section : ''}${sp.intro[0] ? ' · introduced in “' + spanTitle(sp.intro[0]) + '”' : ''} · tested by ${tb} exercise${tb === 1 ? '' : 's'}</span><br>${c.why ?? ''}<br><span class="kind">Click to pin: highlights where it is introduced, used and tested.</span>`;
  });
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

<div class="legend"><span class="k-idea">idea</span><span class="k-result">result</span><span class="k-skill">skill</span><span class="ext">other section</span></div>
<div class="dag" bind:this={host}>
  <svg viewBox="0 0 {box.w} {box.h}">{#each paths as p}<path d={p.d} class:hot={hover === p.from || hover === p.to} />{/each}</svg>
  {#each rows as row}
    <div class="row" class:dense={row.length >= 3}>
      {#each row as id (id)}
        {@const c = node(id)}
        <button type="button" class="node k-{c.kind}" class:ext={c.ext} class:pinned={pin.pinned === id} class:active={coverage?.introduces.includes(id)} class:active-weak={coverage?.uses.includes(id)} data-id={id}
          onclick={() => click(id)} onmouseenter={() => (hover = id)} onfocus={() => (hover = id)} onmouseleave={() => (hover = null)} onblur={() => (hover = null)}>
          <span use:math={c.name}>{@html c.name}</span>{#if c.ext}<small class="sec">{c.section}</small>{/if}
        </button>
      {/each}
    </div>
  {/each}
</div>
<div class="why" use:math={why}>{#if why}{@html why}{:else}<b>Hover a concept</b> to see why it matters. Click one to pin it and see where the text introduces, uses and tests it.{/if}</div>

<style>
  .dag{position:relative}
  .row{display:flex;flex-wrap:wrap;justify-content:space-around;gap:8px 6px;margin-bottom:30px;position:relative;z-index:1}   /* a row of many prerequisites wraps rather than squeezes */
  .row:last-child{margin-bottom:0}
  .node{font:inherit;font-size:0.78rem;line-height:1.15;padding:5px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer;text-align:center;max-width:120px;min-width:0}
  .node :global(.katex){font-size:0.95em}
  .node.ext{border-style:dashed;color:var(--muted);background:transparent}
  .node.active{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent)}
  .node.active-weak{border-color:var(--muted)}
  .node.pinned{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel))}
  .node:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .node.k-idea{background:var(--soft);font-weight:600;border-color:var(--soft2)}
  .node.k-skill{border-radius:14px;font-style:italic;padding:5px 10px}
  .node small.sec{display:block;font-size:0.65rem;color:var(--muted);font-weight:400;font-style:normal}
  .row.dense{font-size:0.7rem}
  svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
  svg path{fill:none;stroke:var(--rule);stroke-width:1.5}
  svg path.hot{stroke:var(--muted)}
  .why{margin-top:14px;padding:10px 12px;border-radius:5px;background:var(--soft);font-size:0.8rem;color:var(--muted);min-height:3em}
  .why :global(b){color:var(--ink);font-weight:600}
  .why :global(.kind){font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em}
  .legend{display:flex;flex-wrap:wrap;gap:4px 10px;margin:-4px 0 10px;font-size:0.7rem;color:var(--muted)}
  .legend span::before{content:"";display:inline-block;width:9px;height:9px;margin-right:4px;vertical-align:-1px;border:1px solid var(--rule);border-radius:2px;background:var(--panel)}
  .legend .k-idea::before{background:var(--soft);border-color:var(--soft2)}
  .legend .k-skill::before{border-radius:5px}
  .legend .ext::before{border-style:dashed;background:transparent}
  :global(.view-pane) .node{font-size:0.9rem;max-width:180px;padding:7px 10px}
  :global(.view-pane) .row{margin-bottom:44px}
</style>
