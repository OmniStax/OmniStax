<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { plain } from '../../lib/practice/labels';
  import type { ConceptDTO } from '../../lib/content/schema';
  import type { Node } from '../../lib/practice/select';
  import { bookId, conceptId } from '../../lib/types/ids';
  import { goConceptFromView } from '../../lib/sections/concepts.svelte';
  import { openingInView } from '../../lib/sections/nav.svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { mathHtml } from '../actions/math';
  import MasteryBox from './MasteryBox.svelte';
  import KindDot from './KindDot.svelte';

  let { item, selectable = false, folded = false }: { item?: string; selectable?: boolean; folded?: boolean } = $props();

  type Group = { readonly key: string; readonly book: string; readonly heading: string; readonly order: number; readonly concepts: readonly ConceptDTO[] };
  const SHOWN = 6;

  const loading = $derived(focus.book !== null && books.status[focus.book] !== 'loaded');
  const groups = $derived.by((): readonly Group[] => {
    const byKey = new Map<string, { book: string; section: string; concepts: ConceptDTO[] }>();
    for (const c of practice.ready()) {
      const book = books.bookOf(c.id);
      if (!book) continue;
      const key = `${book}/${c.section}`;
      const g = byKey.get(key) ?? { book, section: c.section, concepts: [] };
      g.concepts.push(c);
      byKey.set(key, g);
    }
    const shelf = [...new Set([...byKey.values()].map((g) => g.book))];
    const many = shelf.length > 1;
    return [...byKey.entries()].map(([key, g]) => {
      const sections = books.manifest(g.book)?.chapters.flatMap((ch) => ch.sections) ?? [];
      const at = sections.findIndex((s) => s.id === g.section);
      const title = at < 0 ? '' : sections[at].title;
      const heading = `${many ? `${books.title(g.book)} · ` : ''}${g.section}${title ? ` · ${title}` : ''}`;
      return { key, book: g.book, heading, order: shelf.indexOf(g.book) * 1e6 + (at < 0 ? 1e5 : at), concepts: g.concepts };
    }).sort((a, b) => a.order - b.order);
  });
  let all = $state(false);
  const shown = $derived(all ? groups : groups.slice(0, SHOWN));
  const count = $derived(groups.reduce((n, g) => n + g.concepts.length, 0));
  const node = (id: string): Node => ({ level: 'concept', concept: id });
  const mixed = (el: HTMLInputElement, on: boolean) => {
    el.indeterminate = on;
    return { update: (v: boolean) => { el.indeterminate = v; } };
  };

  const buildsOn = (c: ConceptDTO): string => {
    const names = c.prereqs.map((p) => plain(practice.conceptOf(p)?.name ?? p));
    const rest = names.length - 3;
    return `builds on ${names.slice(0, 3).join(', ')}${rest > 0 ? ` and ${rest} more` : ''}`;
  };
  const goConcept = (e: MouseEvent | KeyboardEvent, b: string, id: string): void => {
    const how = openingInView(e);
    if (how === 'tab' && settings.cardOpen === 'click') return;
    void goConceptFromView(bookId(b), conceptId(id), how);
  };
</script>

{#snippet list()}
{#if loading}
  <p class="meta" role="status">Loading…</p>
{:else if groups.length === 0}
  <p class="meta">Master a concept, or set its progress in the tree below, and what builds on it appears here.</p>
{:else}
  {#each shown as g (g.key)}
    <div class="group">
      <div class="headrow">
        <p class="meta head">{g.heading}</p>
        {#if selectable && item}<button type="button" class="btn ghost sm" onclick={() => { for (const c of g.concepts) practice.setNode(item, node(c.id), true); }}>Add all</button>{/if}
      </div>
      {#each g.concepts as c (c.id)}
        <div class="row">
          {#if selectable && item}
            {@const on = practice.check(item, node(c.id))}
            <input type="checkbox" class="pick" aria-label="Select {plain(c.name)}" checked={on === 'on'} use:mixed={on === 'some'} onchange={() => practice.toggleNode(item, node(c.id))} />
          {/if}
          <MasteryBox id={c.id} />
          <KindDot kind={c.kind} />
          <span class="go" role="button" tabindex="0" onclick={(e) => goConcept(e, g.book, c.id)} onauxclick={(e) => { if (e.button === 1) goConcept(e, g.book, c.id); }} onkeydown={(e) => { if (e.key === 'Enter') goConcept(e, g.book, c.id); }} use:mathHtml={c.name}></span>
          <span class="meta on">{buildsOn(c)}</span>
        </div>
      {/each}
    </div>
  {/each}
  {#if groups.length > SHOWN}
    <button type="button" class="btn ghost sm more" onclick={() => (all = !all)}>{all ? 'Show fewer' : `Show all ${groups.length}`}</button>
  {/if}
{/if}
{/snippet}

{#if folded}
  <details class="ready">
    <summary>Ready to learn · {count} {count === 1 ? 'concept' : 'concepts'}</summary>
    {@render list()}
  </details>
{:else}
  {@render list()}
{/if}

<style>
  .group + .group{margin-top:8px}
  .headrow{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .head{padding:0 4px}
  .pick{margin:0;accent-color:var(--ink)}
  summary{cursor:pointer;font-size:0.85rem;padding:2px 0}
  details[open] > summary{margin-bottom:6px}
  .row{display:flex;align-items:center;gap:6px;min-height:28px;padding:0 4px;border-radius:6px;transition:background-color 120ms}
  .row:hover{background:var(--soft)}
  .go{cursor:pointer;text-decoration:underline dotted var(--muted);text-underline-offset:3px}
  :global(html.no-underlines) .go{text-decoration:none}
  .go:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .on{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .more{margin-top:8px}
</style>
