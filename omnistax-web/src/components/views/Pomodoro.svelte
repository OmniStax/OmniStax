<script lang="ts">
  /* The pomodoro panel: one clock, the few controls it needs, and the way
     through to the stats. The clock counts down a length the reader picks from
     a row of chips, or counts up as a stopwatch that can be seeded with a
     stretch they did not time. A session that ends — whether it reached its end
     or was lost to the screen lock — asks for this panel, and the panel answers
     by scrolling itself into view and putting the cursor in the summary box, so
     that the reader can say in one line what they did, file it under a category
     or two, and press Enter. */
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import { LENGTH_PRESETS, isOver, seedOf } from '../../lib/pomodoro/model';
  import { itemKey, viewItem } from '../../lib/types/ids';
  import { openItem } from '../../lib/sections/nav.svelte';
  import Vectors from '../pomodoro/Vectors.svelte';
  import CategoryPicker from '../pomodoro/CategoryPicker.svelte';
  const s = $derived(pomodoro.session);
  const over = $derived(isOver(s));
  const stopwatch = $derived(s.mode === 'stopwatch');
  let summary = $state('');
  let picked = $state<readonly string[]>([]);
  let custom = $state(false);
  let seedH = $state(0);
  let seedM = $state(0);
  let root = $state<HTMLDivElement | null>(null);
  let box = $state<HTMLInputElement | null>(null);

  $effect(() => { pomodoro.init(); });
  /* Every ending bumps the counter, whether the session got there or was lost. */
  $effect(() => {
    if (!pomodoro.ended) return;
    summary = '';
    picked = [];
    root?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    requestAnimationFrame(() => box?.focus());
  });
  const keep = (): void => { pomodoro.keep(summary, picked); summary = ''; picked = []; };
  const seed = (h: number, m: number): void => { seedH = h; seedM = m; pomodoro.setSeed(seedOf(h, m)); };
  const openStats = (): void => { void openItem(itemKey(viewItem('pomodoro-stats'))); };
  const SAYS: Readonly<Record<string, string>> = {
    idle: 'Ready when you are.',
    running: 'Focus. The clock is running.',
    paused: 'Paused.',
    done: 'Time. What did you get done?',
    lost: 'You left the window for too long, so this one is lost.',
  };
  const said = $derived(stopwatch && s.phase === 'done' ? 'Stopped. What did you get done?' : SAYS[s.phase]);
</script>

<div class="pom" bind:this={root} data-phase={s.phase}>
  <div class="modes" role="group" aria-label="Timing mode">
    <button type="button" class:on={!stopwatch} disabled={s.phase !== 'idle'} onclick={() => pomodoro.setMode('pomodoro')}>Pomodoro</button>
    <button type="button" class:on={stopwatch} disabled={s.phase !== 'idle'} onclick={() => pomodoro.setMode('stopwatch')}>Stopwatch</button>
  </div>

  <div class="face">
    <Vectors running={s.phase === 'running'} />
    <div class="digits" aria-live="off">{pomodoro.clock}</div>
  </div>
  <p class="says" class:bad={s.phase === 'lost'} aria-live="polite">{said}</p>

  <div class="controls">
    {#if s.phase === 'idle' || over}
      <button type="button" class="go" onclick={() => pomodoro.start()}>Start</button>
    {:else if s.phase === 'running'}
      <button type="button" class="go" onclick={() => pomodoro.pause()}>Pause</button>
      {#if stopwatch}<button type="button" onclick={() => pomodoro.finish()}>Finish</button>{/if}
      <button type="button" onclick={() => pomodoro.stop()}>Stop</button>
    {:else}
      <button type="button" class="go" onclick={() => pomodoro.resume()}>Resume</button>
      {#if stopwatch}<button type="button" onclick={() => pomodoro.finish()}>Finish</button>{/if}
      <button type="button" onclick={() => pomodoro.stop()}>Stop</button>
    {/if}
  </div>

  {#if s.phase === 'idle' && !stopwatch}
    <div class="chips" role="group" aria-label="Session length">
      {#each LENGTH_PRESETS as m (m)}
        <button type="button" class:on={!custom && s.minutes === m} onclick={() => { custom = false; pomodoro.setLength(m); }}>{m}</button>
      {/each}
      <button type="button" class="soft" class:on={custom} onclick={() => (custom = !custom)}>Custom</button>
      {#if custom}
        <input class="mins" type="number" min="1" max="120" step="1" aria-label="Minutes" value={s.minutes} oninput={(e) => pomodoro.setLength(Number(e.currentTarget.value))} />
      {/if}
    </div>
  {/if}

  {#if s.phase === 'idle' && stopwatch}
    <label class="row seed" title="Seed the stopwatch with a stretch you did not time, so it can still be recorded.">
      <span>Start from</span>
      <input type="number" min="0" max="23" step="1" aria-label="Hours" value={seedH} oninput={(e) => seed(Number(e.currentTarget.value), seedM)} />
      <span class="unit">:</span>
      <input type="number" min="0" max="59" step="1" aria-label="Minutes" value={seedM} oninput={(e) => seed(seedH, Number(e.currentTarget.value))} />
      <span class="unit">hh:mm</span>
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
      <CategoryPicker picked={picked} onpick={(ids) => (picked = ids)} />
      <div class="controls">
        <button type="submit" class="go">Record</button>
        <button type="button" onclick={() => pomodoro.discard()}>Discard</button>
      </div>
    </form>
  {/if}

  <button type="button" class="stats" onclick={openStats}>View stats →</button>
</div>

<style>
  .pom{display:flex;flex-direction:column;gap:10px;font-family:var(--sans);min-width:0}
  .modes{display:flex;border:1px solid var(--rule);border-radius:7px;overflow:hidden}
  .modes button{flex:1;border:0;border-radius:0;padding:5px 8px;font-size:0.78rem;background:var(--panel)}
  .modes button + button{border-left:1px solid var(--rule)}
  .modes button.on{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);font-weight:600}
  .modes button:disabled{opacity:.55;cursor:default}
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
  .chips{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
  .chips button{padding:3px 10px;font-size:0.78rem;border-radius:999px}
  .chips button.on{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}
  .chips .mins{width:4.5em;font:inherit;font-size:0.78rem;padding:3px 5px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink)}
  .row{display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--muted)}
  .row input[type="number"]{width:3.6em;font:inherit;padding:3px 5px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink)}
  .seed .unit{font-size:0.76rem}
  .check{cursor:pointer}
  .summary{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--rule);padding-top:8px}
  .summary label{font-size:0.82rem;color:var(--muted)}
  .summary input{font:inherit;font-size:0.85rem;padding:5px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink)}
  .stats{align-self:flex-start;margin-top:2px;padding:2px 0;border:0;background:none;font-size:0.82rem;color:var(--accent)}
  .stats:hover{background:none;text-decoration:underline}
</style>
