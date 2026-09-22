<script lang="ts">
  /* The pomodoro panel: one clock, the few controls it needs, and the list of
     the sessions that have ended. A session that ends asks for this panel — the
     store opens it in the sidebar — and the panel answers by scrolling itself
     into view and putting the cursor in the summary box, so that the reader can
     say in one line what they did and press Enter. */
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import { isOver } from '../../lib/pomodoro/model';
  import Vectors from '../pomodoro/Vectors.svelte';
  const s = $derived(pomodoro.session);
  const over = $derived(isOver(s));
  let summary = $state('');
  let root = $state<HTMLDivElement | null>(null);
  let box = $state<HTMLInputElement | null>(null);

  $effect(() => { pomodoro.init(); });
  /* Every ending bumps the counter, whether the session got there or was lost. */
  $effect(() => {
    if (!pomodoro.ended) return;
    summary = '';
    root?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    requestAnimationFrame(() => box?.focus());
  });
  const keep = (): void => { pomodoro.keep(summary); summary = ''; };
  const when = (ms: number): string => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const ran = (p: { start: number; end: number }): number => Math.max(1, Math.round((p.end - p.start) / 60_000));
  const SAYS: Readonly<Record<string, string>> = {
    idle: 'Ready when you are.',
    running: 'Focus. The clock is running.',
    paused: 'Paused.',
    done: 'Time. What did you get done?',
    lost: 'You left the window for too long, so this one is lost.',
  };
</script>

<div class="pom" bind:this={root} data-phase={s.phase}>
  <div class="face">
    <Vectors running={s.phase === 'running'} />
    <div class="digits" aria-live="off">{pomodoro.clock}</div>
  </div>
  <p class="says" class:bad={s.phase === 'lost'} aria-live="polite">{SAYS[s.phase]}</p>

  <div class="controls">
    {#if s.phase === 'idle' || over}
      <button type="button" class="go" onclick={() => pomodoro.start()}>Start</button>
    {:else if s.phase === 'running'}
      <button type="button" class="go" onclick={() => pomodoro.pause()}>Pause</button>
      <button type="button" onclick={() => pomodoro.stop()}>Stop</button>
    {:else}
      <button type="button" class="go" onclick={() => pomodoro.resume()}>Resume</button>
      <button type="button" onclick={() => pomodoro.stop()}>Stop</button>
    {/if}
  </div>

  {#if s.phase === 'idle'}
    <label class="row">
      <span>Length</span>
      <input type="number" min="1" max="120" step="1" value={s.minutes} oninput={(e) => pomodoro.setLength(Number(e.currentTarget.value))} />
      <span class="unit">min</span>
    </label>
  {/if}

  {#if pomodoro.lockable}
    <label class="row check" title="Leave the window for more than ten seconds and the session is lost.">
      <input type="checkbox" checked={pomodoro.screenLock} onchange={(e) => pomodoro.setScreenLock(e.currentTarget.checked)} />
      <span>Screen Lock</span>
    </label>
  {/if}

  {#if over}
    <form class="summary" onsubmit={(e) => { e.preventDefault(); keep(); }}>
      <label for="pomodoro-summary">What did you work on?</label>
      <input id="pomodoro-summary" bind:this={box} bind:value={summary} type="text" autocomplete="off" placeholder="A line about this session" />
      <div class="controls">
        <button type="submit" class="go">Record</button>
        <button type="button" onclick={() => pomodoro.discard()}>Discard</button>
      </div>
    </form>
  {/if}

  <h3 class="eyebrow">History</h3>
  {#if !pomodoro.log.length}
    <p class="empty">No sessions yet.</p>
  {:else}
    <ul class="log">
      {#each pomodoro.log as p (p.start)}
        <li class:lost={!p.completed}>
          <span class="head"><span class="mins">{ran(p)} min</span><span class="at">{when(p.start)}</span></span>
          {#if p.summary}<span class="what">{p.summary}</span>{/if}
          {#if !p.completed}<span class="tag">lost</span>{/if}
        </li>
      {/each}
    </ul>
    <button type="button" class="clear" onclick={() => pomodoro.clearLog()}>Clear history</button>
  {/if}
</div>

<style>
  .pom{display:flex;flex-direction:column;gap:10px;font-family:var(--sans);min-width:0}
  .face{position:relative;aspect-ratio:1;max-width:220px;width:100%;align-self:center;display:grid;place-items:center}
  .digits{position:relative;font-variant-numeric:tabular-nums;font-size:2.4rem;font-weight:600;letter-spacing:0.02em;color:var(--ink)}
  .pom[data-phase="running"] .digits{color:var(--accent)}
  .says{margin:0;font-size:0.82rem;color:var(--muted);text-align:center}
  .says.bad{color:var(--bad)}
  .controls{display:flex;gap:6px;flex-wrap:wrap}
  button{font:inherit;font-size:0.82rem;padding:5px 12px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--ink);cursor:pointer}
  button:hover{background:var(--soft)}
  button.go{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent)}
  button:focus-visible{outline:2px solid var(--accent)}
  .row{display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--muted)}
  .row input[type="number"]{width:4.5em;font:inherit;padding:3px 5px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink)}
  .check{cursor:pointer}
  .summary{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--rule);padding-top:8px}
  .summary label{font-size:0.82rem;color:var(--muted)}
  .summary input{font:inherit;font-size:0.85rem;padding:5px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink)}
  .eyebrow{margin:6px 0 0;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)}
  .empty{margin:0;font-size:0.82rem;color:var(--muted)}
  .log{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
  .log li{display:flex;flex-direction:column;gap:2px;font-size:0.82rem;border-left:2px solid var(--accent);padding-left:8px}
  .log li.lost{border-left-color:var(--muted);opacity:.7}
  .head{display:flex;gap:8px;align-items:baseline}
  .mins{font-weight:600;color:var(--ink)}
  .at{color:var(--muted);font-size:0.76rem}
  .what{color:var(--ink)}
  .tag{color:var(--muted);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em}
  .clear{align-self:flex-start;font-size:0.76rem;padding:3px 8px}
</style>
