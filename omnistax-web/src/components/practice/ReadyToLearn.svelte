<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { plain } from '../../lib/practice/labels';
  import type { ConceptDTO } from '../../lib/content/schema';
  import { bookId, conceptId } from '../../lib/types/ids';
  import { goConceptFromView } from '../../lib/sections/concepts.svelte';
  import { openingInView } from '../../lib/sections/nav.svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { mathHtml } from '../actions/math';
  import MasteryBox from './MasteryBox.svelte';
  import KindDot from './KindDot.svelte';

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

{#if loading}
  <p class="muted" role="status">Loading…</p>
{:else if groups.length === 0}
  <p class="muted">Master a concept, or set its progress in the tree below, and what builds on it appears here.</p>
{:else}
  {#each shown as g (g.key)}
    <div class="group">
      <p class="muted head">{g.heading}</p>
      {#each g.concepts as c (c.id)}
        <div class="row">
          <MasteryBox id={c.id} />
          <KindDot kind={c.kind} />
          <span class="go" role="button" tabindex="0" onclick={(e) => goConcept(e, g.book, c.id)} onauxclick={(e) => { if (e.button === 1) goConcept(e, g.book, c.id); }} onkeydown={(e) => { if (e.key === 'Enter') goConcept(e, g.book, c.id); }} use:mathHtml={c.name}></span>
          <span class="muted on">{buildsOn(c)}</span>
        </div>
      {/each}
    </div>
  {/each}
  {#if groups.length > SHOWN && !all}
    <button type="button" class="btn ghost sm" onclick={() => (all = true)}>Show all {groups.length}</button>
  {/if}
{/if}

<style>
  .muted{margin:0;color:var(--muted);font-size:0.78rem}
  .group + .group{margin-top:8px}
  .head{padding:0 4px}
  .row{display:flex;align-items:center;gap:6px;min-height:28px;padding:0 4px;border-radius:6px;transition:background-color 120ms}
  .row:hover{background:var(--soft)}
  .go{cursor:pointer;text-decoration:underline dotted var(--muted);text-underline-offset:3px}
  :global(html.no-underlines) .go{text-decoration:none}
  .go:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .on{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .btn{margin-top:8px}
</style>
