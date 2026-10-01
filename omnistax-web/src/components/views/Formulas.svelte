<script lang="ts">
  /* The important equations of the place this view stands at, each under the
     concept it states and that concept's kind, a definition's as the symbol it
     defines, all in ink. Grouped by the
     section that states them: flat for a section, under a line per section for a
     chapter, under a fold per chapter for the book. What lies outside the place
     is folded away below, so the rest of the book is one click and never in the way.

     A formula goes into a note by being dragged onto it, which drops the embed
     that writes it out as a card; the click it keeps still jumps to where the
     text states it. */
  import { registry } from '../../lib/sections/registry.svelte';
  import Fold from '../ui/Fold.svelte';
  import { getContext as getCtx } from 'svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import type { Target } from '../../lib/sections/scope';
  import { countOf, groupBySection, label, outsideLabel, type ChapterGroup, type SectionGroup } from '../../lib/sections/grouping';
  import { goSpan, findEl } from '../../lib/sections/nav.svelte';
  import { dragout } from '../../lib/notes/md/dragout';
  import { spanId, spanRef, sectionId } from '../../lib/types/ids';
  import type { ConceptDTO, EquationDTO } from '../../lib/content/schema';
  import { formulaLabel } from '../../lib/sections/conceptlists';
  import { figFor } from '../../lib/fig/figlib';
  const scoped = getCtx<() => Target>('scope');
  const target = $derived(scoped());
  const book = $derived(target.book);
  const eqs = $derived(registry.chaptersOf(book).flatMap((c) => c.formulas.equations).filter((e) => e.important));
  const concepts = $derived(new Map(registry.concepts(book).map((c) => [c.id as string, c])));
  /* The symbol a definition names its quantity by: the first the sheet gives it. */
  const symbols = $derived.by(() => {
    const m = new Map<string, string>();
    registry.chaptersOf(book).flatMap((c) => c.formulas.variables).forEach((v) => { if (v.concept && !m.has(v.concept)) m.set(v.concept, v.sym); });
    return m;
  });
  const symbolOf = (c: ConceptDTO): string | undefined => { const s = symbols.get(c.id); return s ? registry.manifest(book).symbols[s] ?? s : undefined; };
  const grouped = $derived(groupBySection(eqs, (e) => sectionId(e.section), target, registry.manifest(book)));
  const openChapter = $derived(focus.section && focus.section.book === book ? registry.chapterOf(focus.section)?.id ?? '' : '');
  const spanTitle = (id: string): string => { const h = findEl(book, id)?.querySelector('h2, h3'); if (!h) return id; const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove()); return c.textContent?.replace(/^Example [\d.]+ · /, '') ?? id; };
  const tex = (node: HTMLElement, s: string) => { figFor(book).tex(node, s); return { update(n: string) { figFor(book).tex(node, n); } }; };
</script>

{#snippet list(items: readonly EquationDTO[])}
  {#each items as e (e.id)}
    {@const named = formulaLabel(e, concepts, symbolOf)}
    <button type="button" class="formula" data-sec={e.section} use:dragout={{ kind: 'equation', book, section: e.section, id: e.id }} onclick={() => goSpan(e.anchor ? spanRef(book, spanId(e.anchor)) : undefined)}>
      {#if named.kind === 'defines'}<div class="named">defines {#if named.tex}<span use:tex={named.tex}></span>{:else}{named.word}{/if}</div>
      {:else if named.kind === 'states'}<div class="named"><i class="tag">{named.tag}</i>{named.word}</div>{/if}
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
  <Fold class="chapter" {open}>
    {#snippet summary()}{label(g.chapter, g.title)}{/snippet}
    {#each g.sections as s (s.section)}{@render sectionGroup(s)}{/each}
  </Fold>
{/snippet}

<div class="rows" data-book={book}>
{#if target.level === 'section'}
  {#each grouped.inside as c (c.chapter)}{#each c.sections as s (s.section)}{@render list(s.items)}{/each}{/each}
{:else if target.level === 'chapter'}
  {#each grouped.inside as c (c.chapter)}{#each c.sections as s (s.section)}{@render sectionGroup(s)}{/each}{/each}
{:else}
  {#each grouped.inside as c (c.chapter)}{@render chapterGroup(c, c.chapter === openChapter)}{/each}
{/if}
{#if grouped.outside.length}
  <Fold class="other">
    {#snippet summary()}{outsideLabel(target)} · {countOf(grouped.outside)}{/snippet}
    {#each grouped.outside as c (c.chapter)}{@render chapterGroup(c, false)}{/each}
  </Fold>
{/if}
</div>

<style>
  .rows{display:contents}
  /* the sheet sets formulas in ink; the hue is the text's to give */
  .rows :global(.enclosing){color:inherit}
  .named{display:flex;align-items:baseline;gap:6px;font-size:0.74rem;color:var(--muted);margin-bottom:2px}
  .named :global(.katex){font-size:1em}
  .tag{font-style:normal;text-transform:uppercase;letter-spacing:0.06em;font-size:0.6rem;padding:0 5px;border-radius:9px;background:var(--soft);color:var(--muted)}
  .formula{display:block;width:100%;text-align:left;font:inherit;padding:8px 10px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer;margin-bottom:6px}
  .formula:hover{background:var(--soft)}
  .formula:focus-visible{outline:2px solid var(--accent)}
  .formula :global(.katex){font-size:1.05em}
  .formula small{display:block;color:var(--muted);font-size:0.72rem;margin-top:2px}
</style>
