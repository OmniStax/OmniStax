<script lang="ts">
  /* The important equations of the place this view stands at, grouped by the
     section that states them: flat for a section, under a line per section for a
     chapter, under a fold per chapter for the book. What lies outside the place
     is folded away below, so the rest of the book is one click and never in the way. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { getContext as getCtx } from 'svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import type { Target } from '../../lib/sections/scope';
  import { countOf, groupBySection, label, outsideLabel, type ChapterGroup, type SectionGroup } from '../../lib/sections/grouping';
  import { goSpan, findEl, goFind } from '../../lib/sections/nav.svelte';
  import { spanId, sectionId } from '../../lib/types/ids';
  import type { EquationDTO } from '../../lib/content/schema';
  import { FIG } from '../../lib/fig/figlib';
  import SearchBox from './SearchBox.svelte';
  const scoped = getCtx<() => Target>('scope');
  const target = $derived(scoped());
  const eqs = $derived(Object.values(registry.chapters).flatMap((c) => c.formulas.equations).filter((e) => e.important));
  const grouped = $derived(groupBySection(eqs, (e) => sectionId(e.section), target, registry.manifest));
  const openChapter = $derived(registry.chapterOf(focus.section)?.id ?? '');
  const spanTitle = (id: string): string => { const h = findEl(id)?.querySelector('h2, h3'); if (!h) return id; const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove()); return c.textContent?.replace(/^Example [\d.]+ · /, '') ?? id; };
  const tex = (node: HTMLElement, s: string) => { FIG.tex(node, s); return { update(n: string) { FIG.tex(node, n); } }; };
  /* What the search bar finds: the equations inside the level, by their id or the TeX
     they are written in, or by the condition they hold under and the span that states them. */
  const inside = $derived(grouped.inside.flatMap((c) => c.sections.flatMap((s) => s.items)));
  const findable = (e: EquationDTO) => ({ key: `${e.id} ${e.tex}`, text: `${e.condition ?? ''} ${e.anchor ? spanTitle(e.anchor) : ''}` });
  let host = $state<HTMLElement | null>(null);
</script>

{#snippet list(items: readonly EquationDTO[])}
  {#each items as e (e.id)}
    <button type="button" class="formula" data-find={e.id} onclick={() => goSpan(e.anchor ? spanId(e.anchor) : undefined)}>
      <div use:tex={e.tex}></div>
      <small>{e.condition ? e.condition + ' · ' : ''}{e.anchor ? 'in “' + spanTitle(e.anchor) + '”' : ''}</small>
    </button>
  {/each}
{/snippet}

{#snippet sectionGroup(g: SectionGroup<EquationDTO>)}
  <div class="eyebrow">{label(g.section, g.title)}</div>
  {@render list(g.items)}
{/snippet}

{#snippet chapterGroup(g: ChapterGroup<EquationDTO>, open: boolean)}
  <details class="chapter" {open}>
    <summary>{label(g.chapter, g.title)}</summary>
    {#each g.sections as s (s.section)}{@render sectionGroup(s)}{/each}
  </details>
{/snippet}

<SearchBox items={inside} of={findable} onpick={(e) => goFind(host, e.id)} placeholder="Find a formula…">
  {#snippet row(e: EquationDTO)}<span class="key eq" use:tex={e.tex}></span><span class="text">{e.section}{#if e.condition} · {e.condition}{/if}</span>{/snippet}
</SearchBox>
<div bind:this={host}>
{#if target.level === 'section'}
  {#each grouped.inside as c (c.chapter)}{#each c.sections as s (s.section)}{@render list(s.items)}{/each}{/each}
{:else if target.level === 'chapter'}
  {#each grouped.inside as c (c.chapter)}{#each c.sections as s (s.section)}{@render sectionGroup(s)}{/each}{/each}
{:else}
  {#each grouped.inside as c (c.chapter)}{@render chapterGroup(c, c.chapter === openChapter)}{/each}
{/if}
{#if grouped.outside.length}
  <details class="other">
    <summary>{outsideLabel(target)} · {countOf(grouped.outside)}</summary>
    {#each grouped.outside as c (c.chapter)}{@render chapterGroup(c, false)}{/each}
  </details>
{/if}
</div>

<style>
  .formula{display:block;width:100%;text-align:left;font:inherit;padding:8px 10px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer;margin-bottom:6px}
  .formula:hover{background:var(--soft)}
  .formula:focus-visible{outline:2px solid var(--accent)}
  .formula :global(.katex){font-size:1.05em}
  .formula small{display:block;color:var(--muted);font-size:0.72rem;margin-top:2px}
  .eq :global(.katex){font-size:0.95em}
</style>
