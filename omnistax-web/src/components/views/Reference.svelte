<script lang="ts">
  /* What the place this view stands at teaches, one row per concept: its kind,
     its name and the one symbol the book denotes it by, its unit, its statement
     and its main form, with the other forms behind a toggle. Flat for a
     section, under a line per section for a chapter, under a fold per chapter
     for the book.

     A row goes to where its concept is introduced, a form to where the text
     states it, and a row dragged into a note writes the concept out there as a
     card. */
  import { registry } from '../../lib/sections/registry.svelte';
  import Fold from '../ui/Fold.svelte';
  import { getContext as getCtx } from 'svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import type { Target } from '../../lib/sections/scope';
  import { groupBySection, label, type ChapterGroup, type SectionGroup } from '../../lib/sections/grouping';
  import { KIND_LABEL, referenceRows, type ReferenceRow } from '../../lib/sections/reference';
  import { conceptId, sectionId, sectionRef, spanId, spanRef } from '../../lib/types/ids';
  import type { FormDTO } from '../../lib/content/schema';
  import { goSpanFromView, openSectionFromView, openingInView, type Opening } from '../../lib/sections/nav.svelte';
  import { goConceptFromView } from '../../lib/sections/concepts.svelte';
  import { targetOf } from '../../lib/hover/cards';
  import { settings } from '../../lib/settings/store.svelte';
  import { figFor } from '../../lib/fig/figlib';
  import { dragout } from '../../lib/notes/md/dragout';
  const scoped = getCtx<() => Target>('scope');
  const target = $derived(scoped());
  const book = $derived(target.book);
  const tree = $derived(registry.manifest(book));
  const rows = $derived(referenceRows(registry.concepts(book), registry.coverage(book), registry.variables(book)));
  const grouped = $derived(groupBySection(rows, (r) => sectionId(r.concept.section), target, tree));
  const openChapter = $derived(focus.section && focus.section.book === book ? registry.chapterOf(focus.section)?.id ?? '' : '');
  /* the reader opens a concept's other forms; which ones, by concept id */
  let shown = $state<ReadonlySet<string>>(new Set());
  const toggle = (id: string): void => { const next = new Set(shown); if (!next.delete(id)) next.add(id); shown = next; };
  const tex = (node: HTMLElement, s: string) => { figFor(book).tex(node, s); return { update: (n: string) => figFor(book).tex(node, n) }; };
  const math = (node: HTMLElement, s: string) => {
    const set = (t: string): void => { node.textContent = t; figFor(book).renderMath(node); };
    set(s); return { update: set };
  };
  /* A click the reader's card setting gives to a symbol or a form inside the row stays the card's. */
  const pick = (r: ReferenceRow, e: MouseEvent): void => {
    const how = openingInView(e);
    if (how === 'tab' && settings.cardOpen === 'click' && targetOf(e.target)) return;
    void goConceptFromView(book, conceptId(r.concept.id), how);
  };
  const goForm = (f: FormDTO, how: Opening): void => {
    if (f.anchor) goSpanFromView(spanRef(book, spanId(f.anchor)), how); else void openSectionFromView(sectionRef(book, f.section), how);
  };
  const pickForm = (f: FormDTO, e: MouseEvent): void => {
    e.stopPropagation();
    const how = openingInView(e);
    if (how === 'tab' && settings.cardOpen === 'click' && targetOf(e.target)) return;
    goForm(f, how);
  };
</script>

{#snippet form(f: FormDTO)}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="form" data-eq={f.id} onclick={(e) => pickForm(f, e)}>
    <div class="eq" use:tex={f.tex}></div>
    {#if f.condition}<small>{f.condition}</small>{/if}
  </div>
{/snippet}

{#snippet row(r: ReferenceRow)}
  {@const c = r.concept}
  {@const extra = c.forms.slice(1)}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <li data-sec={c.section} use:dragout={{ kind: 'concept', book, section: c.section, id: c.id }} onclick={(e) => pick(r, e)} onauxclick={(e) => { if (e.button === 1) pick(r, e); }}>
    <div class="head">
      <i class="tag k-{c.kind}">{KIND_LABEL[c.kind]}</i>
      <span class="name" use:math={c.name}></span>
      {#if c.symbol}<span class="sym" use:tex={tree.symbols[c.symbol] ?? c.symbol}></span>{/if}
      {#if r.unit}<span class="unit">{r.unit}</span>{/if}
    </div>
    {#if c.status === 'built' && c.statement}<p class="statement" use:math={c.statement}></p>{/if}
    {#if c.forms[0]}{@render form(c.forms[0])}{/if}
    {#if extra.length}
      <button type="button" class="more" aria-expanded={shown.has(c.id)} onclick={(e) => { e.stopPropagation(); toggle(c.id); }}>
        {shown.has(c.id) ? 'Fewer forms' : `${extra.length} more ${extra.length === 1 ? 'form' : 'forms'}`}
      </button>
      {#if shown.has(c.id)}<div class="extra">{#each extra as f (f.id)}{@render form(f)}{/each}</div>{/if}
    {/if}
  </li>
{/snippet}

{#snippet list(items: readonly ReferenceRow[])}
  <ul class="refs">{#each items as r (r.concept.id)}{@render row(r)}{/each}</ul>
{/snippet}

{#snippet sectionGroup(g: SectionGroup<ReferenceRow>)}
  <div class="eyebrow">{label(g.section, g.title)}</div>
  {@render list(g.items)}
{/snippet}

{#snippet chapterGroup(g: ChapterGroup<ReferenceRow>, open: boolean)}
  <Fold class="chapter" {open}>
    {#snippet summary()}{label(g.chapter, g.title)}{/snippet}
    {#each g.sections as s (s.section)}{@render sectionGroup(s)}{/each}
  </Fold>
{/snippet}

<div class="rows" data-book={book}>
{#if target.level === 'section'}
  {#each grouped as c (c.chapter)}{#each c.sections as s (s.section)}{@render list(s.items)}{/each}{/each}
{:else if target.level === 'chapter'}
  {#each grouped as c (c.chapter)}{#each c.sections as s (s.section)}{@render sectionGroup(s)}{/each}{/each}
{:else}
  {#each grouped as c (c.chapter)}{@render chapterGroup(c, c.chapter === openChapter)}{/each}
{/if}
</div>

<style>
  .rows{display:contents}
  .refs{list-style:none;padding:0;margin:0}
  /* the open hand says the row is a thing to take: it goes into a note by being dragged there */
  .refs > li{padding:8px 0;border-bottom:1px solid var(--rule);font-size:0.82rem;cursor:grab;min-width:0}
  .refs > li:active{cursor:grabbing}
  .head{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px}
  .name{font-weight:600}
  .name :global(.katex){font-size:1em}
  .sym :global(.katex){font-size:1.05em}
  .tag{font-style:normal;text-transform:uppercase;letter-spacing:0.06em;font-size:0.6rem;padding:0 5px;border-radius:9px;background:var(--soft);color:var(--muted)}
  .unit{font-family:var(--mono);font-size:0.72rem;color:var(--muted)}
  .statement{margin:2px 0 0;line-height:1.4}
  .statement :global(.katex){font-size:1em}
  .form{margin-top:4px;cursor:pointer}
  .form small{display:block;color:var(--muted);font-size:0.72rem}
  .eq{overflow-x:auto}
  .eq :global(.katex){font-size:1em}
  .more{margin-top:3px;padding:0;border:0;background:none;font:inherit;font-size:0.72rem;color:var(--muted);cursor:pointer}
  .more:hover{color:var(--ink)}
  .more:focus-visible{outline:2px solid var(--accent)}
  .extra{margin-left:10px;padding-left:8px;border-left:2px solid var(--rule)}
  :global(.view-pane) .refs > li{font-size:0.95rem}
</style>
