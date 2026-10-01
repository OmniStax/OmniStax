<script lang="ts">
  /* The definitions of the place this view stands at, one row per concept: the
     word, the symbols that name it with their meaning in the section read, the
     statement, the unit and the formulas that define it. A word or a symbol the
     book gives no concept stands on a row of its own. Flat for a section, under
     a line per section for a chapter, under a fold per chapter for the book,
     with whatever lies outside folded away below. Everything is in ink: the
     list names quantities, it does not colour them.

     A row is dragged into a note the same way a formula is: it carries the
     embed that writes it out there as a card. */
  import { registry } from '../../lib/sections/registry.svelte';
  import Fold from '../ui/Fold.svelte';
  import { getContext as getCtx } from 'svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import type { Target } from '../../lib/sections/scope';
  import { countOf, groupBySection, label, outsideLabel, type ChapterGroup, type SectionGroup } from '../../lib/sections/grouping';
  import { definitionRows, wordOf, KIND_LABEL, type DefinitionRow } from '../../lib/sections/conceptlists';
  import { chapterOf } from '../../lib/sections/scope';
  import { sectionId, type SectionId } from '../../lib/types/ids';
  import { figFor } from '../../lib/fig/figlib';
  import { dragout } from '../../lib/notes/md/dragout';
  const scoped = getCtx<() => Target>('scope');
  const target = $derived(scoped());
  const book = $derived(target.book);
  const tree = $derived(registry.manifest(book));
  const inScope = (s: SectionId): boolean => target.level === 'book' || (target.level === 'section' ? s === target.section : chapterOf(tree, s) === target.chapter);
  const rows = $derived(definitionRows({
    concepts: registry.concepts(book), coverage: registry.coverage(book),
    variables: registry.chaptersOf(book).flatMap((c) => c.formulas.variables),
    equations: registry.chaptersOf(book).flatMap((c) => c.formulas.equations),
    glossary: registry.chaptersOf(book).flatMap((c) => c.formulas.glossary),
  }, inScope, target.level === 'section' ? target.section : undefined));
  const grouped = $derived(groupBySection(rows, (r) => r.section, target, tree));
  const openChapter = $derived(focus.section && focus.section.book === book ? registry.chapterOf(focus.section)?.id ?? '' : '');
  const sym = (node: HTMLElement, s: string) => { figFor(book).tex(node, tree.symbols[s] ?? s); return {}; };
  const tex = (node: HTMLElement, s: string) => { figFor(book).tex(node, s); return {}; };
  const math = (node: HTMLElement, s: string) => { node.textContent = s; figFor(book).renderMath(node); return {}; };
  const wordFor = (r: DefinitionRow): string => r.words[0]?.term ?? (r.concept ? wordOf(r.concept.name) : '');
  const embed = (r: DefinitionRow) => r.words.length ? { kind: 'term' as const, book, section: r.words[0].section, term: r.words[0].term }
    : r.symbols.length ? { kind: 'symbol' as const, book, section: r.symbols[0].section, sym: r.symbols[0].sym }
      : { kind: 'concept' as const, book, section: sectionId(r.concept?.section ?? r.section), id: r.concept?.id ?? r.key };
</script>

{#snippet row(r: DefinitionRow)}
  {@const word = wordFor(r)}
  {@const head = word || (r.symbols.length === 1 ? r.symbols[0].meaning : '')}
  {@const meanings = r.symbols.length > 1 || (word !== '' && r.symbols.some((s) => s.redefines))}
  {@const statement = (r.concept?.status === 'built' ? r.concept.statement : undefined) ?? r.words[0]?.definition}
  <li data-sec={r.section} use:dragout={embed(r)}>
    <span class="syms">{#each r.symbols as v (v.sym)}<span class="sym" use:sym={v.sym}></span>{/each}</span>
    <div class="what">
      <div class="head">
        {#if head}<span class="word">{head}</span>{/if}
        {#if r.concept && r.concept.kind !== 'definition'}<i class="tag">{KIND_LABEL[r.concept.kind]}</i>{/if}
        {#if r.unit}<span class="unit">{r.unit}</span>{/if}
      </div>
      {#if statement}<p class="statement" use:math={statement}></p>{/if}
      {#if meanings}<ul class="means">{#each r.symbols as v (v.sym)}<li><span class="sym" use:sym={v.sym}></span><span>{v.meaning}</span></li>{/each}</ul>{/if}
      {#each r.formulas as e (e.id)}<div class="eq" use:tex={e.tex}></div>{/each}
    </div>
  </li>
{/snippet}

{#snippet list(items: readonly DefinitionRow[])}
  <ul class="defs">{#each items as r (r.key)}{@render row(r)}{/each}</ul>
{/snippet}

{#snippet sectionGroup(g: SectionGroup<DefinitionRow>)}
  <div class="eyebrow">{label(g.section, g.title)}</div>
  {@render list(g.items)}
{/snippet}

{#snippet chapterGroup(g: ChapterGroup<DefinitionRow>, open: boolean)}
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
  /* the list names quantities in ink; the hue is the text's to give */
  .rows :global(.enclosing){color:inherit}
  .defs{list-style:none;padding:0;margin:0}
  /* the open hand says the row is a thing to take: it goes into a note by being dragged there */
  .defs > li{display:grid;grid-template-columns:3.4em 1fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--rule);font-size:0.82rem;align-items:baseline;cursor:grab}
  .defs > li:active{cursor:grabbing}
  .syms{display:flex;flex-direction:column;gap:2px}
  .sym :global(.katex){font-size:1.1em}
  .what{min-width:0}
  .head{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px}
  .word{font-weight:600}
  .tag{font-style:normal;text-transform:uppercase;letter-spacing:0.06em;font-size:0.6rem;padding:0 5px;border-radius:9px;background:var(--soft);color:var(--muted)}
  .unit{font-family:var(--mono);font-size:0.72rem;color:var(--muted)}
  .statement{margin:2px 0 0;line-height:1.4}
  .statement :global(.katex){font-size:1em}
  .means{list-style:none;margin:4px 0 0;padding:0;display:grid;grid-template-columns:auto 1fr;gap:1px 8px;color:var(--muted);font-size:0.76rem}
  .means li{display:contents}
  .means .sym :global(.katex){font-size:1em}
  .eq{margin-top:4px;overflow-x:auto}
  .eq :global(.katex){font-size:1em}
  :global(.view-pane) .defs > li{font-size:0.95rem}
</style>
