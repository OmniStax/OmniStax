<script lang="ts">
  import { untrack } from 'svelte';
  import { type DayKey, type EntryDraft, type Pomodoro, blankDraft, draftOf, entryOf, ranMs, spanText } from '../../lib/pomodoro/model';
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import CategoryPicker from './CategoryPicker.svelte';
  let { entry = null, ondone }: { entry?: Pomodoro | null; ondone: () => void } = $props();

  const first: EntryDraft = untrack(() => (entry ? draftOf(entry) : blankDraft(Date.now())));
  let day = $state<string>(first.day);
  let from = $state(first.from);
  let to = $state(first.to);
  let summary = $state(first.summary);
  let cats = $state<readonly string[]>(first.categories);

  const next = $derived(entryOf({ day: day as DayKey, from, to, summary, categories: cats }, entry?.id ?? '', entry ?? undefined));
  const save = (): void => {
    if (!next) return;
    if (entry) pomodoro.amend(next);
    else pomodoro.add({ ...next, id: pomodoro.newId() });
    ondone();
  };
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form class="editor" aria-label={entry ? 'Edit session' : 'Add session'} onsubmit={(e) => { e.preventDefault(); save(); }}
  onkeydown={(e) => { if (e.key === 'Escape') ondone(); }}>
  <div class="when">
    <input class="input day" type="date" aria-label="Day" bind:value={day} />
    <input class="input time" type="time" aria-label="From" bind:value={from} />
    <span class="dash">–</span>
    <input class="input time" type="time" aria-label="To" bind:value={to} />
    <span class="ran">{next ? spanText(ranMs(next)) : ''}</span>
  </div>
  <input class="input" type="text" aria-label="Summary" placeholder="What did you work on?" bind:value={summary} autocomplete="off" />
  <CategoryPicker picked={cats} onpick={(ids) => (cats = ids)} />
  <div class="acts">
    <button type="submit" class="btn primary sm" disabled={!next}>{entry ? 'Save' : 'Add'}</button>
    <button type="button" class="btn ghost sm" onclick={ondone}>Cancel</button>
  </div>
</form>

<style>
  .editor{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--rule);border-radius:9px;background:var(--panel);font-family:var(--sans);min-width:0}
  .when{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
  .input{height:28px;font-size:0.8rem;min-width:0}
  .day{flex:1 1 8.5em}
  .time{flex:0 1 6.4em}
  .dash{color:var(--muted)}
  .ran{margin-left:auto;font-size:0.76rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .acts{display:flex;gap:6px}
</style>
