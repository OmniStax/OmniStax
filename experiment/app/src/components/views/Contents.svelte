<script lang="ts">
  /* What the place this view stands at holds. A section shows its objectives,
     its headings and its summary, as the book prints them; a chapter shows its
     sections, and the headings of the ones that are open; the book shows its
     chapters, the one being read already unfolded. A section that is not built
     yet is listed all the same, greyed, so the shape of the book is never a
     surprise. */
  import { registry, type SectionState } from '../../lib/sections/registry.svelte';
  import { getContext as getCtx } from 'svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import type { Target } from '../../lib/sections/scope';
  import { label } from '../../lib/sections/grouping';
  import { spy } from '../../lib/sections/spy.svelte';
  import { go, openDoc } from '../../lib/sections/nav.svelte';
  import { folded } from '../../lib/sections/fold.svelte';
  import { sectionId } from '../../lib/types/ids';
  import type { ChapterEntry, SectionEntry } from '../../lib/content/schema';
  import { math } from '../actions/math';
  const scoped = getCtx<() => Target>('scope');
  const target = $derived(scoped());
  const sec = $derived(target.level === 'section' ? target.section : null);
  const state = $derived(sec ? registry.state(sec) : undefined);
  const chapters = $derived(
    target.level === 'book' ? registry.manifest.chapters
      : target.level === 'chapter' ? registry.manifest.chapters.filter((c) => c.id === target.chapter)
      : [],
  );
  const openChapter = $derived(registry.chapterOf(focus.section)?.id ?? '');
  type Entry = { readonly id: string; readonly title: string };
  /* The headings of a section that has been loaded, in the order its documents print them. */
  const headingsOf = (s: SectionState | undefined): readonly Entry[] => {
    if (!s) return [];
    return Object.values(s.docs).flatMap((doc) => Array.from(doc.querySelectorAll<HTMLElement>('section[id]')).flatMap((el) => {
      const h = el.querySelector('h2, h3'); if (!h) return [];
      const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove());
      return [{ id: el.id, title: c.textContent ?? el.id }];
    }));
  };
</script>

{#snippet toc(entries: readonly Entry[])}
  <nav class="toc">
    {#each entries as e (e.id)}<a href="#{e.id}" class:active={spy.current.section === e.id} class:folded={folded.has(e.id)} onclick={(ev) => { ev.preventDefault(); go(e.id); }}>{e.title}</a>{/each}
  </nav>
{/snippet}

{#snippet row(s: SectionEntry)}
  {@const loaded = registry.state(sectionId(s.id))}
  <button type="button" class="row" class:dim={!s.built} class:active={focus.section === s.id} disabled={!s.built} onclick={() => openDoc(sectionId(s.id), 'text')}>{label(s.id, s.title)}</button>
  {#if loaded?.docs.text}<div class="nested">{@render toc(headingsOf(loaded))}</div>{/if}
{/snippet}

{#snippet chapter(c: ChapterEntry)}
  {#each c.sections as s (s.id)}{@render row(s)}{/each}
{/snippet}

{#if target.level === 'section'}
  {#if state?.meta}
    <div class="sec-title">{label(sec ?? '', state.meta.title)}</div>
    {#if state.meta.objectives.length}
      <details class="objectives"><summary>Learning objectives</summary><ul>{#each state.meta.objectives as o}<li>{o}</li>{/each}</ul></details>
    {/if}
    {@render toc(headingsOf(state))}
    {#if state.meta.summaryHtml}
      <details class="summary"><summary>Section summary</summary><div use:math={state.meta.summaryHtml}>{@html state.meta.summaryHtml}</div></details>
    {/if}
  {/if}
{:else if target.level === 'chapter'}
  {#each chapters as c (c.id)}
    <div class="sec-title">{label(c.id, c.title)}</div>
    {@render chapter(c)}
  {/each}
{:else}
  {#each chapters as c (c.id)}
    <details class="chapter" open={c.id === openChapter}><summary>{label(c.id, c.title)}</summary>{@render chapter(c)}</details>
  {/each}
{/if}

<style>
  .sec-title{font-weight:600;margin-bottom:8px}
  .row{display:block;width:100%;text-align:left;font:inherit;font-size:0.82rem;color:var(--muted);background:none;border:0;border-radius:4px;padding:3px 4px;cursor:pointer}
  .row:hover:not(:disabled){color:var(--ink);background:var(--soft)}
  .row.active{color:var(--ink);font-weight:600}
  .row.dim{opacity:.5;cursor:default}
  .row:focus-visible{outline:2px solid var(--accent)}
  .nested{margin-left:12px;border-left:1px solid var(--rule);padding-left:8px}
  .toc a{display:block;color:var(--muted);text-decoration:none;padding:3px 0;font-size:0.82rem}
  .toc a.active{color:var(--ink);font-weight:600}
  .toc a.folded{opacity:.6}
  details :global(ul){padding-left:1.1rem;margin:6px 0;font-size:0.82rem}
  :global(.view-pane) .toc a{font-size:1rem;padding:5px 0}
  :global(.view-pane) .row{font-size:1rem;padding:5px 4px}
</style>
