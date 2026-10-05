<script lang="ts">
  /* What the round asks of each concept, under the picked list: a default
     count, a count per concept, how many the book has, and the gap generated
     exercises fill; then how they are generated and how answers are graded. */
  import { practice } from '../../lib/practice/store.svelte';
  import { practicePick } from '../../lib/practice/ai.svelte';
  import { MAX_WANTED, type RoundPlan } from '../../lib/practice/model';
  import ModelMenu from '../chat/ModelMenu.svelte';
  import { mathHtml } from '../actions/math';

  let { item, plan, line = '' }: { item: string; plan: RoundPlan; line?: string } = $props();

  const page = $derived(practice.page(item));
  const s = $derived(practice.settings);
  const perConcept = $derived(page.round?.perConcept ?? s.masteryTarget);
  const count = (v: string): number => Math.min(MAX_WANTED, Math.max(0, Math.round(Number(v) || 0)));
  const setDefault = (v: string): void => practice.setRound(item, { ...page.round, perConcept: count(v) });
  const setWanted = (id: string, v: string): void => practice.setRound(item, { ...page.round, wanted: { ...page.round?.wanted, [id]: count(v) } });
  const rows = $derived(plan.concepts.map((id) => ({ id, c: practice.conceptOf(id), q: plan.quotas[id] })));
  const gaps = $derived(rows.some((r) => (r.q?.gap ?? 0) > 0));
  let describe = $state(practice.settings.promptNote.trim() !== '');
  const standard = (): void => { describe = false; practice.setSetting('promptNote', ''); };
</script>

{#if rows.length}
  <section class="plan" aria-label="Exercises per concept">
    <div class="plan-head">
      <label class="def">Per concept <input type="number" min="0" max={MAX_WANTED} value={perConcept} onchange={(e) => setDefault(e.currentTarget.value)}> <span class="quiet">default per concept</span></label>
      <div class="seg" role="radiogroup" aria-label="Generated exercises">
        <span class="quiet">Generated:</span>
        <button type="button" role="radio" class:on={s.generated === 'include'} aria-checked={s.generated === 'include'} onclick={() => practice.setSetting('generated', 'include')}>include</button>
        <button type="button" role="radio" class:on={s.generated === 'book-only'} aria-checked={s.generated === 'book-only'} onclick={() => practice.setSetting('generated', 'book-only')}>book only</button>
      </div>
    </div>
    <ul class="rows">
      {#each rows as r (r.id)}
        <li class="crow">
          <i class="dot k-{r.c?.kind ?? 'idea'}" aria-hidden="true"></i>
          <span class="lab"><span use:mathHtml={r.c?.name ?? r.id}></span></span>
          <span class="book">book {practice.bookAvailable(r.id)}</span>
          <label class="want">wanted <input type="number" min="0" max={MAX_WANTED} value={r.q?.wanted ?? 0} onchange={(e) => setWanted(r.id, e.currentTarget.value)}></label>
          <span class="plus">{#if (r.q?.gap ?? 0) > 0}+{r.q?.gap} generated{/if}</span>
        </li>
      {/each}
    </ul>
    <div class="strip">
      {#if gaps}
        <div class="line">
          <span class="quiet">Generate with</span>
          <ModelMenu pick={practicePick()} onchoose={(p) => practice.setSetting('model', p)} />
          <span class="seg" role="radiogroup" aria-label="Prompt">
            <span class="quiet">Prompt:</span>
            <button type="button" role="radio" class:on={!describe} aria-checked={!describe} onclick={standard}>Standard</button>
            <button type="button" role="radio" class:on={describe} aria-checked={describe} onclick={() => (describe = true)}>Describe</button>
          </span>
          {#if describe}<input class="note" type="text" placeholder="What the exercises should be like" aria-label="Describe the exercises" value={s.promptNote} oninput={(e) => practice.setSetting('promptNote', e.currentTarget.value)}>{/if}
          <label class="check"><input type="checkbox" checked={s.fresh} onchange={(e) => practice.setSetting('fresh', e.currentTarget.checked)}> Generate new, don’t reuse</label>
        </div>
      {/if}
      <div class="line">
        <span class="seg" role="radiogroup" aria-label="Grading">
          <span class="quiet">Grading:</span>
          <button type="button" role="radio" class:on={s.grading === 'reveal'} aria-checked={s.grading === 'reveal'} onclick={() => practice.setSetting('grading', 'reveal')}>Reveal and check</button>
          <button type="button" role="radio" class:on={s.grading === 'ai'} aria-checked={s.grading === 'ai'} onclick={() => practice.setSetting('grading', 'ai')}>AI grades my work</button>
        </span>
        {#if s.grading === 'ai' && !gaps}<span class="quiet">with</span><ModelMenu pick={practicePick()} onchoose={(p) => practice.setSetting('model', p)} />{/if}
      </div>
      {#if line}<p class="progress-line" role="status">{line}</p>{/if}
    </div>
  </section>
{/if}

<style>
  .plan{display:flex;flex-direction:column;gap:6px;margin:8px 0}
  .plan-head,.line{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .quiet{color:var(--muted)}
  input[type=number]{width:3.2em;font:inherit;font-size:.8rem;padding:2px 4px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--ink)}
  .seg{display:inline-flex;align-items:center;gap:0}
  .seg .quiet{margin-right:6px}
  .seg button{font:inherit;font-size:.78rem;white-space:nowrap;border:1px solid var(--rule);background:var(--panel);color:var(--muted);padding:4px 9px;cursor:pointer}
  .seg button+button{border-left:0}
  .seg .quiet+button{border-radius:7px 0 0 7px}
  .seg button:last-child{border-radius:0 7px 7px 0}
  .seg button.on{background:var(--soft);color:var(--ink);font-weight:650}
  .rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
  .crow{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto 7.5em;align-items:center;gap:10px;padding:2px 4px;border-radius:6px}
  .crow:hover{background:var(--soft)}
  .dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--muted)}
  .dot.k-definition{background:var(--cm-definition)}
  .dot.k-axiom{background:var(--cm-axiom)}
  .dot.k-idea{background:var(--cm-idea)}
  .dot.k-result{background:var(--cm-result)}
  .dot.k-skill{background:var(--cm-skill)}
  .lab{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .book{color:var(--muted);font-variant-numeric:tabular-nums}
  .want{color:var(--muted);display:flex;align-items:center;gap:4px}
  .plus{color:var(--accent);font-size:.76rem}
  .strip{display:flex;flex-direction:column;gap:6px;margin-top:4px}
  .strip :global(.pop){left:0;right:auto}
  .note{flex:1 1 14em;font:inherit;font-size:.8rem;padding:4px 8px;border:1px solid var(--rule);border-radius:7px;background:var(--panel);color:var(--ink)}
  .check{display:flex;align-items:center;gap:5px;color:var(--muted)}
  .progress-line{margin:0;color:var(--muted);font-size:.78rem}
  button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
</style>
