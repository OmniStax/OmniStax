<script lang="ts">
  /* Rounds the reader has finished, newest first: when, what they tested and
     how many came out right. Open replays the cards as they were answered;
     Delete forgets the round but not the attempts it recorded. */
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import type { SessionId } from '../../lib/practice/model';
  import ExerciseCard from '../exercises/ExerciseCard.svelte';

  const past = $derived(practice.past());
  let shown = $state<SessionId | null>(null);
  const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const plain = (s: string): string => s.replace(/\$([^$]*)\$/g, '$1').replace(/<[^>]*>/g, '');
  const NAMES = 3;
  const names = (ids: readonly string[]): string => {
    const list = ids.slice(0, NAMES).map((id) => plain(practice.conceptOf(id)?.name ?? id)).join(', ');
    return ids.length > NAMES ? `${list} and ${ids.length - NAMES} more` : list;
  };
  const toggle = (id: SessionId): void => { shown = shown === id ? null : id; };
  $effect(() => {
    const s = shown ? practice.sessions[shown] : undefined;
    s?.drawn.forEach((d) => { if ((books.status[d.book] ?? 'idle') === 'idle') books.load(d.book).catch(() => {}); });
  });
</script>

<section class="panel" aria-label="Past sessions">
  <h3 class="head">Past sessions</h3>
  {#if past.length === 0}<p class="quiet">Finished sessions are listed here.</p>{/if}
  <ul class="list">
    {#each past as s (s.id)}
      <li>
        <div class="row">
          <span class="date">{when.format(s.ended ?? s.started)}</span>
          <span class="what">{names(s.concepts)}</span>
          <span class="score">{s.outcomes.filter((v) => v === true).length}/{s.drawn.length} right</span>
          <button type="button" class="btn" aria-expanded={shown === s.id} onclick={() => toggle(s.id)}>{shown === s.id ? 'Close' : 'Open'}</button>
          <button type="button" class="btn" onclick={() => { if (shown === s.id) shown = null; practice.discard(s.id); }}>Delete</button>
        </div>
        {#if shown === s.id}
          <div class="replay">
            {#each s.drawn as d, i (`${d.book}/${d.section}/${d.ex}`)}
              {@const row = practice.replay(s.id, i)}
              {#if row}
                <ExerciseCard book={row.book} section={row.section} ex={row.ex} outcome={s.outcomes[i]} inline />
              {:else}
                <p class="quiet">Exercise {i + 1} is loading or no longer exists.</p>
              {/if}
            {/each}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .panel{background:var(--panel);border:1px solid var(--rule);border-radius:12px;padding:12px 14px}
  .head{font-family:var(--sans);font-size:1.08rem;font-weight:700;letter-spacing:-0.01em;margin:0 0 8px}
  .quiet{color:var(--muted);margin:2px 0}
  .list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
  .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:3px 4px;border-radius:6px}
  .row:hover{background:var(--soft)}
  .date{color:var(--muted);font-variant-numeric:tabular-nums;flex:none}
  .what{flex:1 1 12em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .score{flex:none;font-variant-numeric:tabular-nums}
  .btn{font:inherit;font-size:0.78rem;font-weight:600;padding:3px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:7px;cursor:pointer}
  .btn:hover{background:var(--soft)}
  .btn:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .replay{padding:8px 0 4px 12px}
</style>
