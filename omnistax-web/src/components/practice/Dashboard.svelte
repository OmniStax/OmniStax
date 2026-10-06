<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { heatWeeks, standingOf, streakOf, workByDay } from '../../lib/practice/model';
  import PageHead from './PageHead.svelte';
  import SessionRows from './SessionRows.svelte';
  import CurriculumTree from './CurriculumTree.svelte';
  import ReadyToLearn from './ReadyToLearn.svelte';
  let { item, shelf }: { item: string; shelf: readonly string[] } = $props();

  const opened = Date.now();
  const weeks = heatWeeks(opened);
  const monthOf = (day: string): string => new Date(`${day}T00:00`).toLocaleDateString(undefined, { month: 'short' });
  const months = weeks.map((w, i) => (i > 0 && w[0].slice(0, 7) !== weeks[i - 1][0].slice(0, 7) ? monthOf(w[0]) : ''));
  const byDay = $derived(workByDay(practice.attempts));
  const depth = (day: string): number => { const n = byDay[day]?.completed ?? 0; return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : n < 15 ? 4 : 5; };
  const dayTitle = (day: string): string => { const work = byDay[day]; return `${day} · ${work ? `${work.completed} exercises · ${work.correct} correct` : 'no exercises'}`; };
  let heat = $state<HTMLElement | null>(null);
  $effect(() => { if (heat) heat.scrollLeft = heat.scrollWidth; });

  const standing = $derived(standingOf(practice.catalog().concepts, practice.mastery));
  const due = $derived(practice.due());
  const figures = $derived([
    { label: 'Day streak', title: undefined, value: streakOf(practice.attempts, Date.now()) },
    { label: 'Exercises done', title: undefined, value: practice.lifetime },
    { label: 'Practiced', title: 'Concepts practiced', value: standing.practised + standing.mastered },
    { label: 'Mastered', title: 'Concepts mastered', value: standing.mastered },
    { label: 'Due', title: 'Concepts due for review', value: due.length },
  ]);
</script>

<div class="dashboard">
  <PageHead title="Practice">
    {#snippet actions()}<button type="button" class="btn primary" onclick={() => practice.seed(item, [])}>New practice session</button>{/snippet}
  </PageHead>

  <section aria-label="Activity">
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
    <div class="key" aria-hidden="true">Less{#each [0, 1, 3, 4, 5] as d (d)}<i class="cell" data-d={d}></i>{/each}More</div>
  </section>

  <section class="part">
    <h3 class="eyebrow">Sessions</h3>
    <SessionRows {item} />
  </section>

  <section class="part">
    <h3 class="eyebrow">Ready to learn</h3>
    <ReadyToLearn />
  </section>

  <section class="part">
    <h3 class="eyebrow">Progress</h3>
    <CurriculumTree {item} {shelf} open={focus.book} selectable={false} />
  </section>
</div>

<style>
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
