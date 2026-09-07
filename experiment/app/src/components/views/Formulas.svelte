<script lang="ts">
  /* Important equations, the focused section first, other sections folded. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { goSpan, findEl } from '../../lib/sections/nav.svelte';
  import { spanId, sectionId } from '../../lib/types/ids';
  import { FIG } from '../../lib/fig/figlib';
  const sec = $derived(focus.section);
  const eqs = $derived(Object.values(registry.chapters).flatMap((c) => c.formulas.equations).filter((e) => e.important));
  const order = $derived([...new Set(eqs.map((e) => e.section))].sort((a, b) => (a === sec ? -1 : b === sec ? 1 : a.localeCompare(b, undefined, { numeric: true }))));
  const titleOf = (s: string) => registry.entry(sectionId(s))?.title ?? '';
  const spanTitle = (id: string): string => { const h = findEl(id)?.querySelector('h2, h3'); if (!h) return id; const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove()); return c.textContent?.replace(/^Example [\d.]+ · /, '') ?? id; };
  const tex = (node: HTMLElement, s: string) => { FIG.tex(node, s); return { update(n: string) { FIG.tex(node, n); } }; };
</script>

{#snippet list(s: string)}
  {#each eqs.filter((e) => e.section === s) as e (e.id)}
    <button type="button" class="formula" onclick={() => goSpan(e.anchor ? spanId(e.anchor) : undefined)}>
      <div use:tex={e.tex}></div>
      <small>{e.constantA ? 'requires constant a · ' : e.constantA === false ? 'always true · ' : ''}{e.anchor ? 'in “' + spanTitle(e.anchor) + '”' : ''}</small>
    </button>
  {/each}
{/snippet}

{#each order as s (s)}
  {#if s === sec}
    <div class="eyebrow">{s} · {titleOf(s)}</div>
    {@render list(s)}
  {:else}
    <details class="other"><summary>{s} · {titleOf(s)}</summary>{@render list(s)}</details>
  {/if}
{/each}

<style>
  .formula{display:block;width:100%;text-align:left;font:inherit;padding:8px 10px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer;margin-bottom:6px}
  .formula:hover{background:var(--soft)}
  .formula:focus-visible{outline:2px solid var(--accent)}
  .formula :global(.katex){font-size:1.05em}
  .formula small{display:block;color:var(--muted);font-size:0.72rem;margin-top:2px}
</style>
