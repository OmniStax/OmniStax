<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { bookId, type SectionId } from '../../lib/types/ids';
  import type { ItemKey } from '../../lib/layout/model';
  import ExerciseCard from '../exercises/ExerciseCard.svelte';

  let { item }: { item: ItemKey } = $props();

  const page = $derived(practice.page(item));
  const session = $derived(practice.sessionOf(item));
  const at = $derived(session?.at ?? 0);
  const drawn = $derived(session?.drawn ?? []);
  const outcomes = $derived(session?.outcomes ?? []);
  const n = $derived(drawn.length);
  const cur = $derived(practice.current(item));
  const pending = $derived(session ? session.drawn[at] : undefined);
  const answered = $derived(outcomes[at] != null);
  const allDone = $derived(!!session && outcomes.every((v) => v !== null));
  const othersOpen = $derived(outcomes.some((v, i) => v === null && i !== at));

  const statusOf = (id: string) => books.status[id] ?? 'idle';
  const chapterDir = (id: string, sec: SectionId): string =>
    (books.manifest(id)?.chapters ?? []).find((c) => c.sections.some((s) => s.id === sec))?.dir ?? '';
  const need = (id: string): void => {
    void registry.ensureBook(bookId(id));
    if (statusOf(id) === 'idle') books.load(id).catch(() => {});
  };
  $effect(() => { if (pending && !cur) need(pending.book); });
  $effect(() => { if (session && cur && !page.showAll) practice.markShown(item); });
  $effect(() => { if (session && page.showAll) session.drawn.forEach((_, i) => practice.markShownAt(item, i)); });
  $effect(() => { if (page.showAll) drawn.forEach((d) => need(d.book)); });

  let root = $state<HTMLElement | null>(null);
  $effect(() => { if (root && cur) registry.decorateRoot(root); });
  let allRoot = $state<HTMLElement | null>(null);
  $effect(() => { if (allRoot && page.showAll) { drawn; registry.decorateRoot(allRoot); } });

  let ending = $state(false);
  $effect(() => { at; page.face; page.showAll; ending = false; });

  const next = (): void => {
    if (at < n - 1) practice.go(item, at + 1);
    else practice.afterAnswer(item, at);
  };
</script>

{#if session}
  <div class="run">
    <div class="bar">
      <button type="button" class="btn ghost sm" title="Pause and return; the session stays open" onclick={() => practice.pause(item)}>‹ Practice</button>
      <span class="where">{page.showAll ? `${n} exercises` : `${at + 1} of ${n}`}</span>
      {#if !page.showAll}
        <nav class="grid" aria-label="Exercises in this session">
          {#each drawn as _, i (i)}
            {@const result = outcomes[i]}
            <button type="button" class:now={i === at} class:right={result === true} class:wrong={result === false}
              aria-label="Exercise {i + 1}{result === true ? ', correct' : result === false ? ', incorrect' : i === at ? ', current' : ''}"
              aria-current={i === at ? 'step' : undefined} onclick={() => practice.go(item, i)}>{result === true ? '✓' : result === false ? '✗' : i + 1}</button>
          {/each}
        </nav>
      {/if}
      {#if ending}
        {@const incomplete = practice.incompleteReviews(item)}
        <div class="confirm">
          <span class="ask">{incomplete ? `Review incomplete. ${incomplete} mastered ${incomplete === 1 ? 'concept still has' : 'concepts still have'} unanswered freshness exercises. Ending now will leave their freshness unchanged, although incorrect answers already submitted may shorten it.` : allDone ? 'End this session? You have answered all of the questions.' : 'End this session? Your completed exercises are kept.'}</span>
          <button type="button" class="btn primary sm" onclick={() => practice.end(item)}>End session</button>
          <button type="button" class="btn ghost sm" onclick={() => (ending = false)}>Keep practicing</button>
        </div>
      {:else}
        <div class="right-side">
          <div class="seg show" role="radiogroup" aria-label="Show">
            <button type="button" role="radio" aria-checked={!page.showAll} class:on={!page.showAll} onclick={() => practice.setShowAll(item, false)}>One at a time</button>
            <button type="button" role="radio" aria-checked={page.showAll} class:on={page.showAll} onclick={() => practice.setShowAll(item, true)}>All</button>
          </div>
          <button type="button" class="btn sm" onclick={() => (ending = true)}>End session</button>
        </div>
      {/if}
    </div>

    {#if page.showAll}
      <div class="all-list" bind:this={allRoot}>
        {#each drawn as d, i (`${d.book}/${d.section}/${d.ex}`)}
          {@const row = practice.exerciseAt(item, i)}
          <section class="all-exercise" aria-label="Exercise {i + 1} of {n}">
            {#if row}
              <div class="card-root" data-book={row.book} data-sec={row.section} data-chapter={chapterDir(row.book, row.section)} data-one="1">
                <ExerciseCard book={row.book} section={row.section} ex={row.ex} outcome={outcomes[i]} session={session.id} number="Exercise {i + 1}" />
              </div>
            {:else if statusOf(d.book) === 'failed'}
              <p class="quiet" role="status">This exercise comes from {practice.bookTitle(d.book)}, and that book could not be loaded.</p>
            {:else}
              <p class="quiet" role="status">Loading this exercise…</p>
            {/if}
          </section>
        {/each}
      </div>
    {:else}
      <div class="one">
        {#if cur}
          {#key `${cur.book}/${cur.section}/${cur.ex.id}/${at}`}
            <div class="card-root" data-book={cur.book} data-sec={cur.section} data-chapter={chapterDir(cur.book, cur.section)} data-one="1" bind:this={root}>
              <ExerciseCard book={cur.book} section={cur.section} ex={cur.ex} outcome={outcomes[at] ?? null} session={session.id}
                number="Exercise {at + 1} of {n}" onanswer={(ok, self) => { if (self) practice.afterAnswer(item, at); }} />
            </div>
          {/key}
        {:else if pending && statusOf(pending.book) === 'failed'}
          <p class="quiet" role="status">This exercise comes from {practice.bookTitle(pending.book)}, and that book could not be loaded. Choose another number to continue.</p>
        {:else}
          <p class="quiet" role="status">Loading the book…</p>
        {/if}
      </div>
      <div class="foot">
        <button type="button" class="btn ghost" disabled={at === 0} onclick={() => practice.go(item, at - 1)}>‹ Previous</button>
        {#if allDone}
          <button type="button" class="btn primary" onclick={() => practice.end(item)}>Finish session</button>
        {:else}
          <button type="button" class="btn" class:primary={answered} disabled={at >= n - 1 && !othersOpen} onclick={next}>Next ›</button>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .run{container-type:inline-size;width:100%;max-width:760px;margin-inline:auto;min-width:0}
  .seg.show{flex:none}
  .seg.show button{white-space:nowrap}
  .bar{position:sticky;top:0;z-index:1;background:var(--bg);border-bottom:1px solid var(--rule);padding:8px 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .where{font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
  .grid{display:flex;flex-wrap:wrap;gap:4px;min-width:0}
  .grid button{width:28px;height:28px;padding:0;font:inherit;font-size:.78rem;font-weight:600;font-variant-numeric:tabular-nums;border:1px solid var(--rule);border-radius:6px;background:transparent;color:var(--muted);cursor:pointer;transition:background-color 120ms}
  .grid button:hover{background:var(--soft);color:var(--ink)}
  .grid button.now{box-shadow:inset 0 0 0 2px var(--ink);color:var(--ink)}
  .grid button.right{color:var(--ok)}
  .grid button.wrong{color:var(--bad)}
  .grid button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .right-side{margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .confirm{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .confirm .ask{flex:1 1 220px;min-width:0}
  .one{padding-top:16px}
  .card-root{margin:0}
  .all-list{display:flex;flex-direction:column}
  .all-exercise{scroll-margin-top:56px;padding:16px 0}
  .all-exercise + .all-exercise{border-top:1px solid var(--rule)}
  .quiet{color:var(--muted)}
  .foot{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--rule);margin-top:24px;padding-top:12px}
  @container (max-width: 420px){
    .right-side{margin-left:0;flex:1 1 100%;justify-content:space-between}
  }
</style>
