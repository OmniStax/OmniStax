<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { fillLive, practicePick } from '../../lib/practice/ai.svelte';
  import { ai } from '../../lib/chat/settings.svelte';
  import { keyOf, MAX_WANTED, type Drawn } from '../../lib/practice/model';
  import { isGenerated } from '../../lib/practice/generated';
  import { books } from '../../lib/practice/books.svelte';
  import { count, exerciseName, excerpt, plain } from '../../lib/practice/labels';
  import ModelMenu from '../chat/ModelMenu.svelte';
  import { mathHtml } from '../actions/math';
  import KindDot from './KindDot.svelte';
  import AiTag from './AiTag.svelte';

  let { item }: { item: string } = $props();

  const FROM = [['include', 'Book and AI'], ['book-only', 'Book only']] as const;
  const ORDER = [['mixed', 'Mixed'], ['grouped', 'Grouped']] as const;
  const CHECKING = [['reveal', 'I check'], ['ai', 'AI grades']] as const;
  const NOTHING = 'No exercises left for now. Choose more of the book or try again later.';

  const page = $derived(practice.page(item));
  const s = $derived(practice.settings);
  const plan = $derived(practice.plan(item));
  const rows = $derived(plan.concepts.map((id) => ({ id, c: practice.conceptOf(id), q: plan.quotas[id] })));
  const gaps = $derived(rows.filter((r) => (r.q?.gap ?? 0) > 0));
  const gapTotal = $derived(Object.values(plan.quotas).reduce((n, q) => n + q.gap, 0));
  const total = $derived(plan.drawn.length + gapTotal);
  const excluded = $derived(page.round?.excluded?.length ?? 0);
  const perConcept = $derived(page.round?.perConcept ?? s.masteryTarget);
  const aiNeeded = $derived(gapTotal > 0 || s.grading === 'ai');
  const aiReady = $derived.by(() => { const pick = practicePick(); return pick !== null && ai.access(pick) !== null; });
  const why = $derived(
    page.curriculum.length === 0 ? 'Nothing chosen yet.'
      : total === 0 ? 'Your choice has no exercises. Pick another part of the book.'
        : aiNeeded && !aiReady ? `Configure a model under Settings → AI, or set ${[gapTotal > 0 && 'Exercises from to Book only', s.grading === 'ai' && 'Checking to I check'].filter(Boolean).join(' and ')}.`
          : '',
  );

  const clamp = (v: number): number => Math.min(MAX_WANTED, Math.max(0, Math.round(v) || 0));
  const setPer = (v: number): void => practice.setRound(item, { ...page.round, perConcept: clamp(v) });
  const setWanted = (id: string) => (v: number): void =>
    practice.setRound(item, { ...page.round, wanted: { ...page.round?.wanted, [id]: clamp(v) } });
  const nameOf = (d: Drawn): string => exerciseName(d.ex, books.manifest(d.book)?.exerciseKinds[d.ex.kind]);
  const remove = (d: Drawn): void => {
    if (d.pinned) practice.toggleNode(item, { level: 'exercise', book: d.book, section: d.section, ex: d.ex.id });
    else practice.exclude(item, keyOf(d));
  };

  let note = $state('');
  const begin = (): void => {
    const id = practice.startLive(item);
    if (!id) { note = NOTHING; return; }
    note = '';
    if (gapTotal > 0) void fillLive(id);
  };
</script>

{#snippet stepper(value: number, set: (v: number) => void, label: string, compact: boolean)}
  <span class="stepper" class:compact role="group" aria-label={label}>
    <button type="button" aria-label="{label}: fewer" disabled={value <= 0} onclick={() => set(value - 1)}>−</button>
    <input type="number" min="0" max={MAX_WANTED} {value} aria-label={label}
      onchange={(e) => { const v = clamp(Number(e.currentTarget.value)); e.currentTarget.value = String(v); set(v); }}>
    <button type="button" aria-label="{label}: more" disabled={value >= MAX_WANTED} onclick={() => set(value + 1)}>+</button>
  </span>
{/snippet}

{#snippet option(name: string, hint: string)}
  <div class="label"><span class="name">{name}</span><span class="hint">{hint}</span></div>
{/snippet}

<section class="plan">
  <div class="group">
    <h3 class="section-title">This session</h3>
    {#if page.curriculum.length === 0}
      <p class="muted">Tick a chapter, section, concept or exercise.</p>
    {:else}
      <p class="headline">{count(total, 'exercise')} · {count(plan.concepts.length, 'concept')}</p>
    {/if}
  </div>

  {#if rows.length}
    <div class="group">
      <div class="opt">
        <span class="name">Exercises per concept</span>
        {@render stepper(perConcept, setPer, 'Exercises per concept', false)}
      </div>
      <div class="table" class:scroll={rows.length > 8}>
        <table>
          <thead><tr><th class="cname">Concept</th><th>In book</th><th>This session</th><th>AI-generated</th></tr></thead>
          <tbody>
            {#each rows as r (r.id)}
              <tr>
                <td class="cname"><span class="cell"><KindDot kind={r.c?.kind ?? 'idea'} /><span class="nm" use:mathHtml={r.c?.name ?? r.id}></span></span></td>
                <td class="n">{practice.bookAvailable(r.id)}</td>
                <td class="n">{@render stepper(r.q?.wanted ?? 0, setWanted(r.id), `This session: ${plain(r.c?.name ?? r.id)}`, true)}</td>
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
      <summary>The {count(total, 'exercise')}</summary>
      <ul class="exs">
        {#each plan.drawn as d (keyOf(d))}
          {@const name = nameOf(d)}
          <li class="ex">
            <span class="exname">{name}</span>
            <span class="excerpt">{excerpt(d.ex.prompt)}</span>
            {#if isGenerated(d.ex.id)}<AiTag text />{/if}
            {#if d.pinned}<span class="tag">picked</span>{/if}
            <button class="btn ghost icon sm" type="button" aria-label="Remove {name}" onclick={() => remove(d)}>×</button>
          </li>
        {/each}
        {#each gaps as r (r.id)}
          <li class="ex gaprow muted">+{r.q?.gap} AI-generated for <span use:mathHtml={r.c?.name ?? r.id}></span>, written when you start</li>
        {/each}
      </ul>
      {#if excluded}
        <p class="excluded"><span class="muted">{excluded} excluded</span><button class="btn ghost sm" type="button" onclick={() => practice.restore(item)}>Restore</button></p>
      {/if}
    </details>
  {/if}

  <div class="group">
    <h3 class="section-title">Options</h3>
    <div class="opt">
      {@render option('Exercises from', 'AI writes more when the book runs short.')}
      <div class="seg one-line" role="radiogroup" aria-label="Exercises from">
        {#each FROM as [v, t] (v)}<button type="button" role="radio" class:on={s.generated === v} aria-checked={s.generated === v} onclick={() => practice.setSetting('generated', v)}>{t}</button>{/each}
      </div>
    </div>
    <div class="opt">
      {@render option('Order', 'Mixed interleaves concepts. Grouped keeps each concept’s exercises together.')}
      <div class="seg" role="radiogroup" aria-label="Order">
        {#each ORDER as [v, t] (v)}<button type="button" role="radio" class:on={s.order === v} aria-checked={s.order === v} onclick={() => practice.setSetting('order', v)}>{t}</button>{/each}
      </div>
    </div>
    <div class="opt">
      {@render option('Checking', 'Check your answers against the solution yourself, or hide it and have your model grade.')}
      <div class="seg one-line" role="radiogroup" aria-label="Checking">
        {#each CHECKING as [v, t] (v)}<button type="button" role="radio" class:on={s.grading === v} aria-checked={s.grading === v} onclick={() => practice.setSetting('grading', v)}>{t}</button>{/each}
      </div>
    </div>
    <div class="opt">
      {@render option('Mastered concepts', 'Include ones not yet due for review.')}
      <button class="toggle" type="button" class:on={s.includeFresh} aria-pressed={s.includeFresh} aria-label="Include mastered concepts" onclick={() => practice.setSetting('includeFresh', !s.includeFresh)}></button>
    </div>
    {#if gapTotal > 0 || s.grading === 'ai'}
      <div class="opt">
        <div class="label"><span class="name">Model</span></div>
        <ModelMenu pick={practicePick()} onchoose={(p) => practice.setSetting('model', p)} />
      </div>
    {/if}
    {#if gapTotal > 0}
      <div class="opt wide">
        {@render option('Prompt', 'Say what the new exercises should be like.')}
        <input class="input" type="text" aria-label="Prompt" value={s.promptNote} oninput={(e) => practice.setSetting('promptNote', e.currentTarget.value)}>
      </div>
      <div class="opt">
        {@render option('Reuse', 'Use AI exercises already written before writing new ones.')}
        <button class="toggle" type="button" class:on={!s.fresh} aria-pressed={!s.fresh} aria-label="Reuse AI exercises" onclick={() => practice.setSetting('fresh', !s.fresh)}></button>
      </div>
    {/if}
  </div>

  <div class="group start">
    <button class="btn primary lg" type="button" disabled={total === 0 || (aiNeeded && !aiReady)} onclick={begin}>
      Start {count(total, 'exercise')}
    </button>
    {#if why}<p class="muted">{why}</p>{/if}
    <p class="muted" role="status">{note}</p>
    {#if plan.shortages > 0}
      <p class="short">{count(plan.shortages, 'concept')} {plan.shortages === 1 ? 'has' : 'have'} fewer exercises than asked.</p>
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
