<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { bookId, type SectionId } from '../../lib/types/ids';
  import type { ItemKey } from '../../lib/layout/model';
  import ExerciseCard from '../exercises/ExerciseCard.svelte';
  import { deleteExercise, fillLive, generation, isGenerating, regenerateExercise, removeExercise } from '../../lib/practice/ai.svelte';
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import { untrack } from 'svelte';
  import { isPending, type SessionId } from '../../lib/practice/model';
  import { isGenerated } from '../../lib/practice/generated';
  import { generated } from '../../lib/practice/generated.svelte';
  import { plain } from '../../lib/practice/labels';
  import { i18n } from '../../lib/i18n/store.svelte';

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
  /* Open slots are written as soon as the session shows, and again after a
     reload: every concept with a slot that no request is writing for and no
     failure has been recorded for is asked for. */
  $effect(() => {
    if (!session) return;
    const id = session.id, job = generation[id];
    const want = [...new Set(session.drawn.flatMap((d) => (isPending(d.ex) && d.concept && !job?.writing[d.concept] && !job?.failed[d.concept] ? [d.concept] : [])))];
    if (want.length) untrack(() => { void fillLive(id, want); });
  });
  /* A generated exercise is written again or deleted from inside the session, after a yes. */
  let confirming = $state<{ readonly i: number; readonly act: 'regenerate' | 'delete' } | null>(null);
  const confirmed = (): void => {
    const c = confirming; if (!c || !session) return;
    if (c.act === 'regenerate') regenerateExercise(session.id, c.i); else deleteExercise(session.id, c.i);
    confirming = null;
  };
  /* Taking the last exercise out leaves nothing to practise, so it is asked
     about, and a yes takes the reader back to the dashboard. */
  let removingLast = $state(false);
  const remove = (i: number): void => { if (n <= 1) { removingLast = true; return; } if (session) removeExercise(session.id, i); };
  const removeLastAndLeave = (): void => { if (session) removeExercise(session.id, 0); removingLast = false; endSession(); };
  /* Ending the round ends the stopwatch it started, and the sitting is kept under the round's name. */
  const endSession = (): void => {
    if (practice.settings.stopwatch && pomodoro.mode === 'stopwatch' && pomodoro.session.phase !== 'idle') { pomodoro.finish(); pomodoro.keep(i18n.t('practice.run.sessionName')); }
    practice.end(item);
  };

  const next = (): void => {
    if (at < n - 1) practice.go(item, at + 1);
    else practice.afterAnswer(item, at);
  };
  const conceptName = (id?: string): string => { const c = id ? practice.conceptOf(id) : undefined; return c ? plain(c.name) : i18n.t('practice.run.thisConcept'); };
  /* The name a grid button reads out: its number and how it stands. */
  const slotLabel = (i: number, busy: boolean, wait: boolean, result: boolean | null | undefined): string =>
    i18n.t(busy ? 'practice.run.slotBusy' : wait ? 'practice.run.slotNotWritten' : result === true ? 'practice.run.slotCorrect' : result === false ? 'practice.run.slotIncorrect' : i === at ? 'practice.run.slotCurrent' : 'practice.run.slot', { n: i + 1 });
  const endAsk = (incomplete: number): string =>
    incomplete ? i18n.t('practice.run.endIncomplete', { n: incomplete }) : allDone ? i18n.t('practice.run.endAllDone') : i18n.t('practice.run.endKept');
  const writingFor = (id: SessionId, concept?: string): boolean => concept ? isGenerating(id, concept) : isGenerating(id);
</script>

{#snippet writing(id: SessionId, concept: string | undefined, i: number)}
  <div class="writing">
    <div class="quiet" role="status">
      {#if writingFor(id, concept)}
        <p><span class="spin" aria-hidden="true"></span> {i18n.t('practice.run.writing', { concept: conceptName(concept) })}</p>
        {#if concept && generation[id]?.writing[concept]}<p class="line">{generation[id].writing[concept]}</p>{/if}
      {:else}
        <p>{i18n.t('practice.run.notWritten', { concept: conceptName(concept) })}</p>
        {#if concept && generation[id]?.failed[concept]}<p class="line bad">{generation[id].failed[concept]}</p>{/if}
      {/if}
      <div class="acts">
        {#if !writingFor(id, concept)}<button type="button" class="btn sm" onclick={() => void fillLive(id, concept ? [concept] : undefined)}>{i18n.t('practice.run.regenerate')}</button>{/if}
        <button type="button" class="btn ghost sm" onclick={() => removeExercise(id, i)}>{i18n.t('practice.run.remove')}</button>
      </div>
    </div>
  </div>
{/snippet}

{#snippet slot(id: SessionId, i: number)}
  {@const d = drawn[i]}
  {@const row = practice.exerciseAt(item, i)}
  {#if row}
    <div class="slot">
      {#key `${row.book}/${row.section}/${row.ex.id}`}
        <div class="card-root" data-book={row.book} data-sec={row.section} data-chapter={chapterDir(row.book, row.section)} data-one="1">
          <ExerciseCard book={row.book} section={row.section} ex={row.ex} outcome={outcomes[i] ?? null} session={id}
            number={page.showAll ? i18n.t('practice.run.number', { i: i + 1 }) : undefined}
            onanswer={undefined} />
        </div>
      {/key}
      {#if isGenerated(row.ex.id)}
        <div class="gen-acts">
          {#if confirming?.i === i}
            <span class="ask">{i18n.t(confirming.act === 'regenerate' ? 'practice.run.askRegenerate' : 'practice.run.askDelete')}</span>
            <button type="button" class="btn primary sm" onclick={confirmed}>{i18n.t('practice.yes')}</button>
            <button type="button" class="btn ghost sm" onclick={() => (confirming = null)}>{i18n.t('practice.no')}</button>
          {:else}
            <button type="button" class="btn ghost sm" onclick={() => (confirming = { i, act: 'regenerate' })}>{i18n.t('practice.run.regenerate')}</button>
            <button type="button" class="btn ghost sm danger" onclick={() => (confirming = { i, act: 'delete' })}>{i18n.t('practice.rows.delete')}</button>
          {/if}
        </div>
      {/if}
      <button type="button" class="btn ghost icon sm rm" aria-label={i18n.t('practice.run.removeN', { n: i + 1 })} title={i18n.t('practice.run.remove')} onclick={() => remove(i)}>×</button>
    </div>
  {:else if isPending(d.ex)}
    {@render writing(id, d.concept, i)}
  {:else}
    <div class="slot">
      <p class="quiet" role="status">
        {#if isGenerated(d.ex) && generated.ready}{i18n.t('practice.run.deleted')}
        {:else if statusOf(d.book) === 'failed'}{i18n.t('practice.run.bookFailed', { book: practice.bookTitle(d.book) })}
        {:else}{i18n.t('practice.run.loading')}{/if}
      </p>
      <button type="button" class="btn ghost icon sm rm" aria-label={i18n.t('practice.run.removeN', { n: i + 1 })} title={i18n.t('practice.run.remove')} onclick={() => remove(i)}>×</button>
    </div>
  {/if}
{/snippet}

{#if session}
  <div class="run">
    <div class="bar">
      <button type="button" class="btn ghost sm back" title={i18n.t('practice.run.pauseTitle')} onclick={() => practice.pause(item)}>{i18n.t('practice.run.back')}</button>
      <span class="where">{page.showAll ? i18n.t('practice.run.count', { n }) : i18n.t('practice.run.of', { i: at + 1, n })}</span>
      {#if !page.showAll}
        <nav class="grid" aria-label={i18n.t('practice.run.grid')}>
          {#each drawn as _, i (i)}
            {@const result = outcomes[i]}
            {@const wait = isPending(drawn[i].ex)}
            {@const busy = wait && writingFor(session.id, drawn[i].concept)}
            <button type="button" class:wait class:now={i === at} class:right={result === true} class:wrong={result === false}
              aria-label={slotLabel(i, busy, wait, result)}
              aria-current={i === at ? 'step' : undefined} onclick={() => practice.go(item, i)}>{busy ? '…' : wait ? '!' : result === true ? '✓' : result === false ? '✗' : i + 1}</button>
          {/each}
        </nav>
      {/if}
      {#if removingLast}
        <div class="confirm">
          <span class="ask">{i18n.t('practice.run.onlyOne')}</span>
          <button type="button" class="btn primary sm" onclick={removeLastAndLeave}>{i18n.t('practice.yes')}</button>
          <button type="button" class="btn ghost sm" onclick={() => (removingLast = false)}>{i18n.t('practice.no')}</button>
        </div>
      {:else if ending}
        {@const incomplete = practice.incompleteReviews(item)}
        <div class="confirm">
          <span class="ask">{endAsk(incomplete)}</span>
          <button type="button" class="btn primary sm" onclick={endSession}>{i18n.t('practice.run.end')}</button>
          <button type="button" class="btn ghost sm" onclick={() => (ending = false)}>{i18n.t('practice.run.keep')}</button>
        </div>
      {:else}
        <div class="right-side">
          <div class="seg show" role="radiogroup" aria-label={i18n.t('practice.run.show')}>
            <button type="button" role="radio" aria-checked={!page.showAll} class:on={!page.showAll} onclick={() => practice.setShowAll(item, false)}>{i18n.t('practice.run.oneAtATime')}</button>
            <button type="button" role="radio" aria-checked={page.showAll} class:on={page.showAll} onclick={() => practice.setShowAll(item, true)}>{i18n.t('practice.run.all')}</button>
          </div>
          <button type="button" class="btn sm" onclick={() => (ending = true)}>{i18n.t('practice.run.end')}</button>
        </div>
      {/if}
    </div>

    {#if page.showAll}
      <div class="all-list" bind:this={allRoot}>
        {#each drawn as d, i (`${d.book}/${d.section}/${d.ex}`)}
          <section class="all-exercise" aria-label={i18n.t('practice.run.numberOf', { i: i + 1, n })}>{@render slot(session.id, i)}</section>
        {/each}
      </div>
    {:else}
      <div class="one" bind:this={root}>
        {#if pending}{@render slot(session.id, at)}{/if}
      </div>
      <div class="foot">
        <button type="button" class="btn ghost" disabled={at === 0} onclick={() => practice.go(item, at - 1)}>{i18n.t('practice.run.previous')}</button>
        {#if allDone}
          <button type="button" class="btn primary" onclick={() => practice.end(item)}>{i18n.t('practice.run.finish')}</button>
        {:else}
          <button type="button" class="btn" class:primary={answered} disabled={at >= n - 1 && !othersOpen} onclick={next}>{i18n.t('practice.run.next')}</button>
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
  .bar .back{align-self:center;font-size:inherit}
  .where{font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
  .grid{display:flex;flex-wrap:wrap;gap:4px;min-width:0}
  .grid button{width:28px;height:28px;padding:0;font:inherit;font-size:.78rem;font-weight:600;font-variant-numeric:tabular-nums;border:1px solid var(--rule);border-radius:6px;background:transparent;color:var(--muted);cursor:pointer;transition:background-color 120ms}
  .grid button:hover{background:var(--soft);color:var(--ink)}
  .grid button.now{box-shadow:inset 0 0 0 2px var(--ink);color:var(--ink)}
  .grid button.right{color:var(--ok)}
  .grid button.wrong{color:var(--bad)}
  .grid button.wait{opacity:.6}
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
  .writing{display:flex;flex-direction:column;gap:8px}
  .writing p{margin:0}
  .writing .line{font-size:.78rem}
  .writing .bad{color:var(--bad)}
  .slot{position:relative}
  .slot :global(.head),.slot > p{padding-right:32px}
  .rm{position:absolute;right:0;top:-4px;opacity:0;transition:opacity 120ms}
  .slot:hover .rm,.rm:focus-visible{opacity:1}
  @media (hover: none){ .rm{opacity:.55} }
  .acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .gen-acts{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px;font-size:0.78rem}
  .gen-acts .ask{color:var(--muted)}
  .spin{display:inline-block;width:.8em;height:.8em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;vertical-align:-.1em;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion: reduce){ .spin{animation-duration:2.4s} }
  .foot{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--rule);margin-top:24px;padding-top:12px}
  @container (max-width: 420px){
    .right-side{margin-left:0;flex:1 1 100%;justify-content:space-between}
  }
</style>
