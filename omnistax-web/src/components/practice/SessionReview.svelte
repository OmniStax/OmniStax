<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { bookId, type SectionId } from '../../lib/types/ids';
  import type { ItemKey } from '../../lib/layout/model';
  import { exerciseName, excerpt, durationText } from '../../lib/practice/labels';
  import { mathHtml } from '../actions/math';
  import ExerciseCard from '../exercises/ExerciseCard.svelte';
  import RowMenu from '../explorer/RowMenu.svelte';
  import PageHead from './PageHead.svelte';
  import MasteryBox from './MasteryBox.svelte';
  import KindDot from './KindDot.svelte';

  let { item }: { item: ItemKey } = $props();

  const session = $derived(practice.sessionOf(item));
  const r = $derived(session ? practice.reviewOf(session.id) : null);
  const when = $derived(session ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(session.ended ?? session.started) : '');
  const missed = $derived(r ? r.wrong + r.skipped : 0);
  const moved = $derived((r?.changes ?? []).flatMap((c) => {
    const concept = practice.conceptOf(c.id);
    return concept ? [{ ...c, concept }] : [];
  }));
  const tallies = $derived((r?.round?.concepts ?? []).filter((c) => c.answered > 0).flatMap((c) => {
    const concept = practice.conceptOf(c.id);
    return concept ? [{ ...c, concept }] : [];
  }));
  const rows = $derived(session ? session.drawn.map((d, i) => ({ d, i, hit: practice.replay(session.id, i) })) : []);

  const chapterDir = (id: string, sec: SectionId): string =>
    (books.manifest(id)?.chapters ?? []).find((c) => c.sections.some((s) => s.id === sec))?.dir ?? '';
  const kindName = (book: string, kind: string): string | undefined => books.manifest(book)?.exerciseKinds[kind];

  $effect(() => {
    if (!session) return;
    [...new Set(session.drawn.map((d) => d.book))].forEach((b) => {
      void registry.ensureBook(bookId(b));
      if ((books.status[b] ?? 'idle') === 'idle') books.load(b).catch(() => {});
    });
  });

  let open = $state<readonly number[]>([]);
  const toggle = (i: number): void => { open = open.includes(i) ? open.filter((j) => j !== i) : [...open, i]; };
  let listRoot = $state<HTMLElement | null>(null);
  $effect(() => { if (listRoot) { open; registry.decorateRoot(listRoot); } });

  let menu = $state<{ x: number; y: number } | null>(null);
  const openMenu = (e: MouseEvent): void => {
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menu = { x: b.right, y: b.bottom };
  };
</script>

{#if session && r}
  {@const id = session.id}
  <div class="review">
    <PageHead title="Session · {when}" back={() => practice.finish(item)}>
      {#snippet actions()}
        {#if missed > 0}<button type="button" class="btn" onclick={() => practice.again(item, id, true)}>Retry the {missed} I missed</button>{/if}
        <button type="button" class="btn primary" onclick={() => practice.again(item, id, false)}>Practice all again</button>
        <button type="button" class="btn ghost icon sm" aria-label="More" onclick={openMenu}>⋯</button>
      {/snippet}
    </PageHead>

    <p class="summary">
      <span><span class="ok g" aria-hidden="true">✓</span><b>{r.correct}</b> correct</span>
      {#if r.wrong}<span><span class="bad g" aria-hidden="true">✗</span><b>{r.wrong}</b> incorrect</span>{/if}
      {#if r.skipped}<span><b>{r.skipped}</b> skipped</span>{/if}
      {#if session.ended}<span>{durationText(session.ended - session.started)}</span>{/if}
    </p>

    <section>
      <h3 class="section-title">What moved</h3>
      {#if moved.length}
        <ul class="list">
          {#each moved as m (m.id)}
            <li class="concept">
              <MasteryBox state={m.from} share={m.fromShare} />
              <span class="arrow" aria-hidden="true">→</span>
              <MasteryBox state={m.to} share={m.toShare} />
              <KindDot kind={m.concept.kind} />
              <span class="name" use:mathHtml={m.concept.name}></span>
            </li>
          {/each}
        </ul>
      {:else if r.round && tallies.length}
        <ul class="list">
          {#each tallies as t (t.id)}
            <li class="concept">
              <KindDot kind={t.concept.kind} />
              <span class="name" use:mathHtml={t.concept.name}></span>
              <span class="quiet">{t.correct}/{t.answered} correct</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="quiet">No concept changed level.</p>
      {/if}
    </section>

    <section>
      <h3 class="section-title">Exercises</h3>
      <ol class="list" bind:this={listRoot}>
        {#each rows as { d, i, hit } (i)}
          {@const v = session.outcomes[i]}
          {@const shown = open.includes(i)}
          <li class="ex">
            <button type="button" class="ex-row" aria-expanded={shown} onclick={() => toggle(i)}>
              <span class="num">{i + 1}</span>
              {#if v === true}<span class="ok" aria-label="Correct">✓</span>
              {:else if v === false}<span class="bad" aria-label="Incorrect">✗</span>
              {:else}<span class="quiet" aria-label="Skipped">–</span>{/if}
              {#if hit}
                <span class="ex-name">{exerciseName(hit.ex, kindName(hit.book, hit.ex.kind))}</span>
                <span class="quiet ex-text">{excerpt(hit.ex.prompt)}</span>
              {:else}
                <span class="quiet ex-text">{practice.bookTitle(d.book)}</span>
              {/if}
            </button>
            {#if shown}
              <div class="unfold">
                {#if hit}
                  <div class="card-root" data-book={hit.book} data-sec={hit.section} data-chapter={chapterDir(hit.book, hit.section)} data-one="1">
                    <ExerciseCard book={hit.book} section={hit.section} ex={hit.ex} outcome={v} review />
                  </div>
                {:else}
                  <p class="quiet" role="status">This exercise is loading or no longer exists.</p>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ol>
    </section>
  </div>
  {#if menu}
    <RowMenu x={menu.x} y={menu.y} onclose={() => (menu = null)} items={[{ label: 'Delete session', danger: true, run: () => practice.discard(id) }]} />
  {/if}
{/if}

<style>
  .review{container-type:inline-size;width:100%;max-width:760px;margin-inline:auto;min-width:0}
  .summary{display:flex;flex-wrap:wrap;column-gap:12px;row-gap:4px;margin:8px 0 16px;font-variant-numeric:tabular-nums}
  .summary .g{margin-right:4px}
  .summary b{font-weight:600}
  .ok{color:var(--ok)}
  .bad{color:var(--bad)}
  .quiet{color:var(--muted)}
  section{border-top:1px solid var(--rule);padding:16px 0}
  section > h3{margin:0 0 8px}
  .list{list-style:none;margin:0;padding:0}
  .concept{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:28px}
  .arrow{color:var(--muted)}
  .name{min-width:0}
  .ex{border-bottom:1px solid var(--rule)}
  .ex-row{display:flex;align-items:center;gap:8px;width:100%;min-height:28px;padding:4px;font:inherit;color:inherit;text-align:left;background:transparent;border:0;border-radius:6px;cursor:pointer;transition:background-color 120ms}
  .ex-row:hover{background:var(--soft)}
  .ex-row:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .num{min-width:2ch;text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}
  .ex-name{font-weight:600;white-space:nowrap}
  .ex-text{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .unfold{padding:8px 0 16px 24px}
  .card-root{margin:0}
  @container (max-width: 420px){
    .unfold{padding-left:8px}
    .ex-row{flex-wrap:wrap}
    .ex-text{flex-basis:100%}
  }
</style>
