<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { fillLive, practicePick } from '../../lib/practice/ai.svelte';
  import { ai } from '../../lib/chat/settings.svelte';
  import { keyOf, MAX_WANTED, type Drawn } from '../../lib/practice/model';
  import { generatedIdOf, isGenerated, pickStored } from '../../lib/practice/generated';
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import { generated } from '../../lib/practice/generated.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { exerciseName, excerpt, plain } from '../../lib/practice/labels';
  import { i18n } from '../../lib/i18n/store.svelte';
  import ModelMenu from '../chat/ModelMenu.svelte';
  import { mathHtml } from '../actions/math';
  import KindTag from './KindTag.svelte';
  import AiTag from './AiTag.svelte';

  let { item }: { item: string } = $props();

  const FROM = $derived([['include', i18n.t('practice.plan.from.include')], ['book-only', i18n.t('practice.plan.from.bookOnly')]] as const);
  const ORDER = $derived([['mixed', i18n.t('practice.plan.order.mixed')], ['grouped', i18n.t('practice.plan.order.grouped')]] as const);
  const CHECKING = $derived([['reveal', i18n.t('practice.plan.checking.reveal')], ['ai', i18n.t('practice.plan.checking.ai')]] as const);

  const page = $derived(practice.page(item));
  const s = $derived(practice.settings);
  const plan = $derived(practice.plan(item));
  const rows = $derived(plan.concepts.map((id) => ({ id, c: practice.conceptOf(id), q: plan.quotas[id] })));
  const gaps = $derived(rows.filter((r) => (r.q?.gap ?? 0) > 0));
  const gapTotal = $derived(Object.values(plan.quotas).reduce((n, q) => n + q.gap, 0));
  const total = $derived(plan.drawn.length + gapTotal);
  /* What the AI side of the round is: how many stored items each concept's gap
     would reuse unless the reader asked for fresh ones, and how many are written. */
  const reuseOf = (id: string): number => (s.fresh ? 0 : pickStored(generated.forConcept(id), id, plan.quotas[id]?.gap ?? 0, practice.attempts).length);
  const reused = $derived(gaps.reduce((n, r) => n + reuseOf(r.id), 0));
  const written = $derived(gapTotal - reused);
  const bookCount = $derived(plan.drawn.filter((d) => !isGenerated(d.ex.id)).length);
  const aiCount = $derived(plan.drawn.length - bookCount + gapTotal);
  const startLabel = $derived([
    bookCount > 0 ? i18n.t('practice.plan.startBook', { n: bookCount }) : '',
    aiCount > 0 ? i18n.t(written > 0 && written < aiCount ? 'practice.plan.startAiSome' : written === aiCount ? 'practice.plan.startAiNew' : 'practice.plan.startAi', { n: aiCount, written }) : '',
  ].filter(Boolean).join(i18n.t('practice.plan.startJoin')));
  const excluded = $derived(page.round?.excluded?.length ?? 0);
  const perConcept = $derived(page.round?.perConcept ?? s.masteryTarget);
  const aiNeeded = $derived(gapTotal > 0 || s.grading === 'ai');
  const aiReady = $derived.by(() => { const pick = practicePick(); return pick !== null && ai.access(pick) !== null; });
  const why = $derived(
    page.curriculum.length === 0 ? i18n.t('practice.plan.nothingChosen')
      : total === 0 ? i18n.t('practice.plan.noExercises')
        : aiNeeded && !aiReady ? i18n.t(gapTotal > 0 && s.grading === 'ai' ? 'practice.plan.needModelBoth' : gapTotal > 0 ? 'practice.plan.needModelFrom' : 'practice.plan.needModelChecking')
          : '',
  );

  const clamp = (v: number): number => Math.min(MAX_WANTED, Math.max(0, Math.round(v) || 0));
  const setPer = (v: number): void => practice.setRound(item, { ...page.round, perConcept: clamp(v) });
  const setWanted = (id: string) => (v: number): void =>
    practice.setRound(item, { ...page.round, wanted: { ...page.round?.wanted, [id]: clamp(v) } });
  const nameOf = (d: Drawn): string => exerciseName(d.ex, books.manifest(d.book)?.exerciseKinds[d.ex.kind], i18n.t);
  const remove = (d: Drawn): void => {
    if (d.pinned) practice.toggleNode(item, { level: 'exercise', book: d.book, section: d.section, ex: d.ex.id });
    else practice.exclude(item, keyOf(d));
  };

  let note = $state('');
  const begin = (): void => {
    const id = practice.startLive(item);
    if (!id) { note = i18n.t('practice.plan.nothingLeft'); return; }
    note = '';
    if (gapTotal > 0) void fillLive(id);
    if (s.stopwatch) { pomodoro.setMode('stopwatch'); pomodoro.start(); }
  };
</script>

{#snippet stepper(value: number, set: (v: number) => void, label: string, compact: boolean)}
  <span class="stepper" class:compact role="group" aria-label={label}>
    <button type="button" aria-label={i18n.t('practice.plan.fewer', { label })} disabled={value <= 0} onclick={() => set(value - 1)}>−</button>
    <input type="number" min="0" max={MAX_WANTED} {value} aria-label={label}
      onchange={(e) => { const v = clamp(Number(e.currentTarget.value)); e.currentTarget.value = String(v); set(v); }}>
    <button type="button" aria-label={i18n.t('practice.plan.more', { label })} disabled={value >= MAX_WANTED} onclick={() => set(value + 1)}>+</button>
  </span>
{/snippet}

{#snippet option(name: string, hint: string)}
  <div class="label"><span class="name">{name}</span><span class="hint">{hint}</span></div>
{/snippet}

<section class="plan">
  <div class="group">
    <h3 class="section-title">{i18n.t('practice.plan.thisSession')}</h3>
    {#if page.curriculum.length === 0}
      <p class="muted">{i18n.t('practice.plan.tick')}</p>
    {:else}
      <p class="headline">{i18n.t('practice.plan.headline', { n: total, concepts: plan.concepts.length })}</p>
    {/if}
  </div>

  {#if rows.length}
    <div class="group">
      <div class="opt">
        <span class="name">{i18n.t('practice.plan.perConcept')}</span>
        {@render stepper(perConcept, setPer, i18n.t('practice.plan.perConcept'), false)}
      </div>
      <div class="table" class:scroll={rows.length > 8}>
        <table>
          <thead><tr><th class="cname">{i18n.t('practice.plan.concept')}</th><th>{i18n.t('practice.plan.inBook')}</th><th>{i18n.t('practice.plan.thisSession')}</th><th>{i18n.t('practice.ai.generated')}</th></tr></thead>
          <tbody>
            {#each rows as r (r.id)}
              <tr>
                <td class="cname"><span class="cell"><KindTag kind={r.c?.kind ?? 'idea'} /><span class="nm" use:mathHtml={r.c?.name ?? r.id}></span></span></td>
                <td class="n">{practice.bookAvailable(r.id)}</td>
                <td class="n">{@render stepper(r.q?.wanted ?? 0, setWanted(r.id), i18n.t('practice.plan.thisSessionFor', { name: plain(r.c?.name ?? r.id) }), true)}</td>
                <td class="n">{#if (r.q?.gap ?? 0) > 0}+{r.q?.gap}{:else}<span class="muted">–</span>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if total > 0 || excluded}
    <details class="group">
      <summary>{i18n.t('practice.plan.theExercises', { n: total })}</summary>
      <ul class="exs">
        {#each plan.drawn as d (keyOf(d))}
          {@const name = nameOf(d)}
          <li class="ex">
            <span class="exname">{name}</span>
            <span class="excerpt">{excerpt(d.ex.prompt)}</span>
            {#if isGenerated(d.ex.id)}<AiTag text />{/if}
            {#if d.pinned}<span class="tag">{i18n.t('practice.plan.picked')}</span>{/if}
            {#if isGenerated(d.ex.id)}<button class="btn ghost sm danger" type="button" aria-label={i18n.t('practice.plan.deleteName', { name })} onclick={() => { if (confirm(i18n.t('practice.plan.deleteAsk', { prompt: excerpt(d.ex.prompt, 60) }))) generated.remove(generatedIdOf(d.ex.id)); }}>{i18n.t('practice.rows.delete')}</button>{/if}
            <button class="btn ghost icon sm" type="button" aria-label={i18n.t('practice.plan.removeName', { name })} onclick={() => remove(d)}>×</button>
          </li>
        {/each}
        {#each gaps as r (r.id)}
          {@const reuse = reuseOf(r.id)}
          {@const fresh = (r.q?.gap ?? 0) - reuse}
          <li class="ex gaprow muted">{i18n.t('practice.plan.gapBefore', { n: r.q?.gap ?? 0 })} <span use:mathHtml={r.c?.name ?? r.id}></span>{i18n.t(reuse > 0 && fresh > 0 ? 'practice.plan.gapBoth' : reuse > 0 ? 'practice.plan.gapReuse' : 'practice.plan.gapWrite', { reuse, fresh })}</li>
        {/each}
      </ul>
      {#if excluded}
        <p class="excluded"><span class="muted">{i18n.t('practice.plan.excluded', { n: excluded })}</span><button class="btn ghost sm" type="button" onclick={() => practice.restore(item)}>{i18n.t('practice.plan.restore')}</button></p>
      {/if}
    </details>
  {/if}

  <div class="group">
    <h3 class="section-title">{i18n.t('practice.plan.options')}</h3>
    <div class="opt">
      {@render option(i18n.t('practice.plan.from'), i18n.t('practice.plan.fromHint'))}
      <div class="seg one-line" role="radiogroup" aria-label={i18n.t('practice.plan.from')}>
        {#each FROM as [v, t] (v)}<button type="button" role="radio" class:on={s.generated === v} aria-checked={s.generated === v} onclick={() => practice.setSetting('generated', v)}>{t}</button>{/each}
      </div>
    </div>
    <div class="opt">
      {@render option(i18n.t('practice.plan.order'), i18n.t('practice.plan.orderHint'))}
      <div class="seg" role="radiogroup" aria-label={i18n.t('practice.plan.order')}>
        {#each ORDER as [v, t] (v)}<button type="button" role="radio" class:on={s.order === v} aria-checked={s.order === v} onclick={() => practice.setSetting('order', v)}>{t}</button>{/each}
      </div>
    </div>
    <div class="opt">
      {@render option(i18n.t('practice.plan.checking'), i18n.t('practice.plan.checkingHint'))}
      <div class="seg one-line" role="radiogroup" aria-label={i18n.t('practice.plan.checking')}>
        {#each CHECKING as [v, t] (v)}<button type="button" role="radio" class:on={s.grading === v} aria-checked={s.grading === v} onclick={() => practice.setSetting('grading', v)}>{t}</button>{/each}
      </div>
    </div>
    <div class="opt">
      {@render option(i18n.t('practice.plan.stopwatch'), i18n.t('practice.plan.stopwatchHint'))}
      <button class="toggle" type="button" class:on={s.stopwatch} aria-pressed={s.stopwatch} aria-label={i18n.t('practice.plan.stopwatchLabel')} onclick={() => practice.setSetting('stopwatch', !s.stopwatch)}></button>
    </div>
    <div class="opt">
      {@render option(i18n.t('practice.plan.mastered'), i18n.t('practice.plan.masteredHint'))}
      <button class="toggle" type="button" class:on={s.includeFresh} aria-pressed={s.includeFresh} aria-label={i18n.t('practice.plan.includeMastered')} onclick={() => practice.setSetting('includeFresh', !s.includeFresh)}></button>
    </div>
    {#if gapTotal > 0 || s.grading === 'ai'}
      <div class="opt">
        <div class="label"><span class="name">{i18n.t('practice.plan.model')}</span></div>
        <ModelMenu pick={practicePick()} onchoose={(p) => practice.setSetting('model', p)} />
      </div>
    {/if}
    {#if gapTotal > 0}
      <div class="opt wide">
        {@render option(i18n.t('practice.plan.prompt'), i18n.t('practice.plan.promptHint'))}
        <textarea class="input" rows="3" aria-label={i18n.t('practice.plan.prompt')} value={s.promptNote} oninput={(e) => practice.setSetting('promptNote', e.currentTarget.value)}></textarea>
      </div>
      <div class="opt">
        {@render option(i18n.t('practice.plan.reuse'), i18n.t('practice.plan.reuseHint'))}
        <button class="toggle" type="button" class:on={!s.fresh} aria-pressed={!s.fresh} aria-label={i18n.t('practice.plan.reuseLabel')} onclick={() => practice.setSetting('fresh', !s.fresh)}></button>
      </div>
    {/if}
  </div>

  <div class="group start">
    <button class="btn primary lg" type="button" disabled={total === 0 || (aiNeeded && !aiReady)} onclick={begin}>
      {startLabel ? i18n.t('practice.plan.startWith', { label: startLabel }) : i18n.t('practice.plan.start')}
    </button>
    {#if why}<p class="muted">{why}</p>{/if}
    <p class="muted" role="status">{note}</p>
    {#if plan.shortages > 0}
      <p class="short">{i18n.t('practice.plan.shortages', { n: plan.shortages })}</p>
    {/if}
  </div>
</section>

<style>
  .plan{container-type:inline-size;width:100%;min-width:0;display:flex;flex-direction:column}
  .group + .group{border-top:1px solid var(--rule);margin-top:16px;padding-top:16px}
  .group{display:flex;flex-direction:column;gap:8px}
  h3{margin:0}
  p{margin:0}
  .muted{color:var(--muted)}
  .headline{font-weight:600;font-variant-numeric:tabular-nums}
  .opt{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;min-height:28px}
  .opt.wide{grid-template-columns:minmax(0,1fr)}
  .label{display:flex;flex-direction:column;gap:2px;min-width:0}
  .name{font-weight:600}
  .hint{color:var(--muted);font-size:0.78rem}
  @container (max-width:340px){ .opt{grid-template-columns:minmax(0,1fr)} .opt > :last-child{justify-self:start} }

  .stepper{display:inline-flex;align-items:stretch;border:1px solid var(--rule);border-radius:6px}
  .stepper button{width:24px;height:24px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--ink);font:inherit;cursor:pointer;transition:background-color 120ms}
  .stepper button:hover:not(:disabled){background:var(--soft)}
  .stepper button:disabled{color:var(--muted);cursor:default}
  .stepper input{width:36px;padding:0;border:0;border-inline:1px solid var(--rule);background:transparent;color:var(--ink);font:inherit;text-align:center;font-variant-numeric:tabular-nums;appearance:textfield;-moz-appearance:textfield}
  .stepper input::-webkit-inner-spin-button,.stepper input::-webkit-outer-spin-button{appearance:none;margin:0}
  .stepper.compact input{width:28px}
  .stepper button:focus-visible,.stepper input:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

  .table.scroll{max-height:340px;overflow:auto}
  .one-line{flex:none}
  .one-line button{white-space:nowrap}
  table{width:100%;border-collapse:collapse}
  th{position:sticky;top:0;background:var(--bg);padding:4px 0 4px 8px;font-size:0.7rem;font-weight:600;color:var(--muted);text-align:right;white-space:nowrap}
  td{padding:2px 0 2px 8px;height:28px}
  th.cname,td.cname{padding-left:0;text-align:left;width:100%;max-width:0}
  .cell{display:flex;align-items:center;gap:6px;min-width:0}
  .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}

  summary{line-height:28px;font-weight:600;cursor:pointer;border-radius:6px}
  .exs{list-style:none;margin:0;padding:0}
  .ex{display:flex;align-items:center;gap:8px;min-height:28px;padding:0 4px;border-radius:6px;transition:background-color 120ms}
  .ex:hover{background:var(--soft)}
  .exname{flex:none;font-weight:600}
  .excerpt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}
  .gaprow{display:block;line-height:28px;font-size:0.78rem}
  .tag{flex:none;font-size:0.7rem;color:var(--muted)}
  .excluded{display:flex;align-items:center;gap:8px}

  .start .btn{width:100%}
  .start p{font-size:0.78rem}
  .start .short{font-size:0.74rem;color:var(--muted)}
</style>
