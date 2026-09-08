<script lang="ts">
  /* Objectives, the table of contents of the focused section (its headings), and the summary. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { getContext as getCtx } from 'svelte';
  import type { SectionId as ScopeSection } from '../../lib/types/ids';
  import { spy } from '../../lib/sections/spy.svelte';
  import { go } from '../../lib/sections/nav.svelte';
  import { folded } from '../../lib/sections/fold.svelte';
  import { math } from '../actions/math';
  const scoped = getCtx<() => ScopeSection>('scope');
  const sec = $derived(scoped());
  const state = $derived(registry.state(sec));
  type Entry = { id: string; title: string };
  const entries = $derived.by((): Entry[] => {
    if (!state) return [];
    return Object.values(state.docs).flatMap((doc) => Array.from(doc.querySelectorAll<HTMLElement>('section[id]')).flatMap((s) => {
      const h = s.querySelector('h2, h3'); if (!h) return [];
      const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove());
      return [{ id: s.id, title: c.textContent ?? s.id }];
    }));
  });
</script>

{#if state?.meta}
  <div class="sec-title">{sec} · {state.meta.title}</div>
  {#if state.meta.objectives.length}
    <details class="objectives"><summary>Learning objectives</summary><ul>{#each state.meta.objectives as o}<li>{o}</li>{/each}</ul></details>
  {/if}
  <nav class="toc">
    {#each entries as e (e.id)}<a href="#{e.id}" class:active={spy.current.section === e.id} class:folded={folded.has(e.id)} onclick={(ev) => { ev.preventDefault(); go(e.id); }}>{e.title}</a>{/each}
  </nav>
  {#if state.meta.summaryHtml}
    <details class="summary"><summary>Section summary</summary><div use:math={state.meta.summaryHtml}>{@html state.meta.summaryHtml}</div></details>
  {/if}
{/if}

<style>
  .sec-title{font-weight:600;margin-bottom:8px}
  .toc a{display:block;color:var(--muted);text-decoration:none;padding:3px 0;font-size:0.82rem}
  .toc a.active{color:var(--ink);font-weight:600}
  .toc a.folded{opacity:.6}
  details :global(ul){padding-left:1.1rem;margin:6px 0;font-size:0.82rem}
  :global(.view-pane) .toc a{font-size:1rem;padding:5px 0}
</style>
