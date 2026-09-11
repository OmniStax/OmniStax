<script lang="ts">
  /* The symbols and the glossary terms of the place this view stands at, each
     section saying its symbols first and its terms after: flat for a section,
     under a line per section for a chapter, under a fold per chapter for the
     book, with whatever lies outside folded away below. The colour legend names
     every quantity the book declares, in the order the reader has put them in,
     so that it reads the same way round as the colour menu. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { getContext as getCtx } from 'svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import type { Target } from '../../lib/sections/scope';
  import { countOf, groupBySection, label, outsideLabel, type ChapterGroup, type SectionGroup } from '../../lib/sections/grouping';
  import { settings } from '../../lib/settings/store.svelte';
  import { colours } from '../../lib/colours/store.svelte';
  import { orderOf } from '../../lib/colours/model';
  import { sectionId } from '../../lib/types/ids';
  import type { VariableDTO, GlossaryDTO } from '../../lib/content/schema';
  import { FIG } from '../../lib/fig/figlib';
  import { goFind } from '../../lib/sections/nav.svelte';
  import SearchBox from './SearchBox.svelte';
  /* One definition: a symbol the book gives a meaning, or a term it defines. */
  type Def = { readonly kind: 'symbol'; readonly symbol: VariableDTO } | { readonly kind: 'term'; readonly term: GlossaryDTO };
  const scoped = getCtx<() => Target>('scope');
  const target = $derived(scoped());
  const defs = $derived<readonly Def[]>([
    ...Object.values(registry.chapters).flatMap((c) => c.formulas.variables).map((symbol): Def => ({ kind: 'symbol', symbol })),
    ...Object.values(registry.chapters).flatMap((c) => c.formulas.glossary).map((term): Def => ({ kind: 'term', term })),
  ]);
  const grouped = $derived(groupBySection(defs, (d) => sectionId(d.kind === 'symbol' ? d.symbol.section : d.term.section), target, registry.manifest));
  /* What the search bar finds: the definitions inside the level, in the order they are
     listed, a symbol by its key or its meaning and a term by its name or its definition.
     Each row wears the same key the search lands on. */
  const keyOf = (d: Def): string => (d.kind === 'symbol' ? `sym:${d.symbol.section}:${d.symbol.sym}` : `term:${d.term.section}:${d.term.term}`);
  const findable = (d: Def) => (d.kind === 'symbol' ? { key: d.symbol.sym, text: `${d.symbol.meaning} ${d.symbol.unit}` } : { key: d.term.term, text: d.term.definition });
  const inside = $derived(grouped.inside.flatMap((c) => c.sections.flatMap((s) => [...s.items.filter((d) => d.kind === 'symbol'), ...s.items.filter((d) => d.kind === 'term')])));
  let host = $state<HTMLElement | null>(null);
  const openChapter = $derived(registry.chapterOf(focus.section)?.id ?? '');
  const sym = (node: HTMLElement, s: string) => { FIG.tex(node, registry.manifest.symbols[s] ?? s); return {}; };
  const legend = $derived(orderOf(registry.manifest, colours.choices).map((k) => [k, registry.manifest.types[k]?.label ?? k] as const));
</script>

{#snippet list(items: readonly Def[])}
  {@const symbols = items.flatMap((d) => (d.kind === 'symbol' ? [d.symbol] : []))}
  {@const terms = items.flatMap((d) => (d.kind === 'term' ? [d.term] : []))}
  {#if symbols.length}
    <div class="eyebrow">{symbols[0].section} · symbols</div>
    <ul class="defs">{#each symbols as v (v.sym)}<li data-find="sym:{v.section}:{v.sym}"><span class="sym" use:sym={v.sym}></span><span>{v.meaning}<span class="unit">{v.unit}</span></span></li>{/each}</ul>
  {/if}
  {#if terms.length}
    <div class="eyebrow">{terms[0].section} · terms</div>
    <ul class="defs terms">{#each terms as t (t.term)}<li data-find="term:{t.section}:{t.term}"><span class="term">{t.term}</span><span>{t.definition}</span></li>{/each}</ul>
  {/if}
{/snippet}

{#snippet sectionGroup(g: SectionGroup<Def>)}
  {@render list(g.items)}
{/snippet}

{#snippet chapterGroup(g: ChapterGroup<Def>, open: boolean)}
  <details class="chapter" {open}>
    <summary>{label(g.chapter, g.title)}</summary>
    {#each g.sections as s (s.section)}{@render sectionGroup(s)}{/each}
  </details>
{/snippet}

<SearchBox items={inside} of={findable} onpick={(d) => goFind(host, keyOf(d))} placeholder="Find a symbol or a term…">
  {#snippet row(d: Def)}
    {#if d.kind === 'symbol'}<span class="key sym" use:sym={d.symbol.sym}></span><span class="text">{d.symbol.meaning}{#if d.symbol.unit} · {d.symbol.unit}{/if}</span>
    {:else}<span class="key term">{d.term.term}</span><span class="text">{d.term.definition}</span>{/if}
  {/snippet}
</SearchBox>
<div bind:this={host}>
{#if target.level === 'book'}
  {#each grouped.inside as c (c.chapter)}{@render chapterGroup(c, c.chapter === openChapter)}{/each}
{:else}
  {#each grouped.inside as c (c.chapter)}{#each c.sections as s (s.section)}{@render sectionGroup(s)}{/each}{/each}
{/if}
{#if grouped.outside.length}
  <details class="other">
    <summary>{outsideLabel(target)} · {countOf(grouped.outside)}</summary>
    {#each grouped.outside as c (c.chapter)}{@render chapterGroup(c, false)}{/each}
  </details>
{/if}
</div>
{#if settings.colorCoding}
  <div class="legend">{#each legend as [k, name] (k)}<i style:background="var(--c-{k})"></i><span>{name}</span>{/each}</div>
{/if}

<style>
  .defs{list-style:none;padding:0;margin:0}
  .defs li{display:grid;grid-template-columns:3.2em 1fr;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:0.82rem;align-items:baseline}
  .defs.terms li{grid-template-columns:8em 1fr}
  .sym :global(.katex){font-size:1.15em}
  .unit{font-family:var(--mono);font-size:0.72rem;color:var(--muted);margin-left:4px}
  .term{font-weight:600}
  .legend{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:0.8rem;margin-top:14px;padding-top:12px;border-top:1px solid var(--rule)}
  .legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:middle}
  :global(.view-pane) .defs li{font-size:0.95rem}
</style>
