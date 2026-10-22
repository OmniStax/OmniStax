<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { heatWeeks, standingOf, streakOf, workByDay } from '../../lib/practice/model';
  import PageHead from './PageHead.svelte';
  import SessionRows from './SessionRows.svelte';
  import CurriculumTree from './CurriculumTree.svelte';
  import ReadyToLearn from './ReadyToLearn.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  let { item, shelf }: { item: string; shelf: readonly string[] } = $props();

  const opened = Date.now();
  const weeks = heatWeeks(opened);
  const monthOf = (day: string): string => new Date(`${day}T00:00`).toLocaleDateString(i18n.locale, { month: 'short' });
  const months = $derived(weeks.map((w, i) => (i > 0 && w[0].slice(0, 7) !== weeks[i - 1][0].slice(0, 7) ? monthOf(w[0]) : '')));
  const byDay = $derived(workByDay(practice.attempts));
  const depth = (day: string): number => { const n = byDay[day]?.completed ?? 0; return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : n < 15 ? 4 : 5; };
  const dayTitle = (day: string): string => { const work = byDay[day]; return work ? i18n.t('practice.dashboard.day', { day, n: work.completed, correct: work.correct }) : i18n.t('practice.dashboard.dayNone', { day }); };
  let heat = $state<HTMLElement | null>(null);
  $effect(() => { if (heat) heat.scrollLeft = heat.scrollWidth; });

  const standing = $derived(standingOf(practice.catalog().concepts, practice.mastery));
  const due = $derived(practice.due());
  const figures = $derived([
    { label: i18n.t('practice.dashboard.streak'), title: undefined, value: streakOf(practice.attempts, Date.now()) },
    { label: i18n.t('practice.dashboard.done'), title: undefined, value: practice.lifetime },
    { label: i18n.t('practice.dashboard.practiced'), title: i18n.t('practice.dashboard.practicedTitle'), value: standing.practised + standing.mastered },
    { label: i18n.t('practice.dashboard.mastered'), title: i18n.t('practice.dashboard.masteredTitle'), value: standing.mastered },
    { label: i18n.t('practice.dashboard.due'), title: i18n.t('practice.dashboard.dueTitle'), value: due.length },
  ]);
</script>

<div class="dashboard">
  <PageHead title={i18n.t('practice.dashboard.title')}>
    {#snippet actions()}<button type="button" class="btn primary" onclick={() => practice.seed(item, [])}>{i18n.t('practice.dashboard.newSession')}</button>{/snippet}
  </PageHead>

  <section aria-label={i18n.t('practice.dashboard.activity')}>
    <div class="figures">
      {#each figures as f (f.label)}
        <div class="figure" title={f.title}><span class="eyebrow">{f.label}</span><span class="value">{f.value}</span></div>
      {/each}
    </div>
    <div class="heat" bind:this={heat}>
      <div class="months" aria-hidden="true">{#each months as m, i (i)}<span class="month">{m}</span>{/each}</div>
      <div class="weeks">
        {#each weeks as week, i (i)}
          <div class="week">
            {#each week as day, j (j)}
              {#if day}<i class="cell" data-d={depth(day)} title={dayTitle(day)}></i>{:else}<i class="cell ahead"></i>{/if}
            {/each}
          </div>
        {/each}
      </div>
    </div>
    <div class="key" aria-hidden="true">{i18n.t('practice.dashboard.less')}{#each [0, 1, 3, 4, 5] as d (d)}<i class="cell" data-d={d}></i>{/each}{i18n.t('practice.dashboard.more')}</div>
  </section>

  <section class="part">
    <div class="head"><h3 class="section-title">{i18n.t('practice.sessions.title')}</h3><button type="button" class="btn ghost sm" onclick={() => practice.sessionsPage(item)}>{i18n.t('practice.dashboard.allSessions')}</button></div>
    <SessionRows {item} limit={5} />
  </section>

  <section class="part">
    <h3 class="section-title">{i18n.t('practice.dashboard.ready')}</h3>
    <ReadyToLearn />
  </section>

  <section class="part">
    <h3 class="section-title">{i18n.t('practice.dashboard.progress')}</h3>
    <CurriculumTree {item} {shelf} open={focus.book} selectable={false} />
  </section>
</div>

<style>
  .head{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .head h3{margin:0}
  .dashboard{display:flex;flex-direction:column;gap:16px;width:100%;max-width:760px;margin-inline:auto;min-width:0}
  .part{border-top:1px solid var(--rule);padding-top:16px}
  h3{margin:0 0 8px}
  .figures{display:grid;grid-template-columns:repeat(5,minmax(0,auto));justify-content:start;column-gap:24px;row-gap:12px;margin-bottom:16px}
  .figure{display:flex;flex-direction:column;gap:4px}
  .value{font-size:1.5rem;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
  .heat{overflow-x:auto;overflow-y:hidden;padding-bottom:2px}
  .months,.weeks{display:flex;gap:2px;width:max-content}
  .months{height:14px}
  .month{width:11px;overflow:visible;white-space:nowrap;font-size:0.68rem;color:var(--muted)}
  .week{display:flex;flex-direction:column;gap:2px}
  .cell{display:inline-block;width:11px;height:11px;border-radius:2px;background:var(--soft2)}
  .cell.ahead{visibility:hidden}
  .cell[data-d="1"]{background:color-mix(in srgb,var(--ok) 22%,var(--soft2))}
  .cell[data-d="2"]{background:color-mix(in srgb,var(--ok) 42%,var(--soft2))}
  .cell[data-d="3"]{background:color-mix(in srgb,var(--ok) 62%,var(--soft2))}
  .cell[data-d="4"]{background:color-mix(in srgb,var(--ok) 82%,var(--soft2))}
  .cell[data-d="5"]{background:var(--ok)}
  .key{display:flex;align-items:center;justify-content:flex-end;gap:2px;margin-top:4px;font-size:0.68rem;color:var(--muted)}
  .key .cell:first-of-type{margin-left:4px}
  .key .cell:last-of-type{margin-right:4px}
  @container (max-width: 520px){
    .figures{grid-template-columns:repeat(3,minmax(0,auto))}
  }
  @container (max-width: 300px){
    .figures{grid-template-columns:repeat(2,minmax(0,auto))}
  }
</style>
