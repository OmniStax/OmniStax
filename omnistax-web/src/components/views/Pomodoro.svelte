<script lang="ts">
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import { LENGTH_PRESETS, isOver, ranMs, seedOf, spanText } from '../../lib/pomodoro/model';
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

  const PHASE: Readonly<Record<string, string>> = { idle: 'Ready', running: 'Focus', paused: 'Paused', done: 'Done', lost: 'Lost' };
  const HOUR = 3_600_000;
  /* Countdown: the share of the length gone. Stopwatch: the minute hand. */
  const fraction = $derived(stopwatch
    ? (pomodoro.left % HOUR) / HOUR
    : s.phase === 'idle' ? 0 : Math.min(1, Math.max(0, 1 - pomodoro.left / (s.minutes * 60_000))));
  const R = 88;
  const C = 2 * Math.PI * R;
  const endsAt = $derived(!stopwatch && s.phase === 'running'
    ? new Date(Date.now() + pomodoro.left).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '');

  const midnight = (): number => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const today = $derived(pomodoro.log.filter((p) => p.completed && p.start >= midnight()));
  const todayMs = $derived(today.reduce((n, p) => n + ranMs(p), 0));
</script>

<div class="pom" bind:this={root} data-phase={s.phase}>
  <div class="seg modes" role="group" aria-label="Timing mode">
    <button type="button" class:on={!stopwatch} disabled={s.phase !== 'idle'} onclick={() => pomodoro.setMode('pomodoro')}>Pomodoro</button>
    <button type="button" class:on={stopwatch} disabled={s.phase !== 'idle'} onclick={() => pomodoro.setMode('stopwatch')}>Stopwatch</button>
  </div>

  <div class="face">
    <Vectors running={s.phase === 'running'} />
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle class="track" cx="100" cy="100" r={R} />
      <circle class="arc" cx="100" cy="100" r={R} stroke-dasharray={C} stroke-dashoffset={C * (1 - fraction)} />
    </svg>
    <div class="dial">
      <span class="eyebrow phase" class:bad={s.phase === 'lost'}>{PHASE[s.phase]}</span>
      <span class="digits" aria-live="off">{pomodoro.clock}</span>
      <span class="sub">{endsAt ? `ends ${endsAt}` : stopwatch ? 'stopwatch' : `${s.minutes} min`}</span>
    </div>
  </div>

  <div class="controls">
    {#if s.phase === 'idle' || over}
      <button type="button" class="btn primary lg" onclick={() => pomodoro.start()}>Start</button>
    {:else}
      {#if s.phase === 'running'}
        <button type="button" class="btn primary lg" onclick={() => pomodoro.pause()}>Pause</button>
      {:else}
        <button type="button" class="btn primary lg" onclick={() => pomodoro.resume()}>Resume</button>
      {/if}
      {#if stopwatch}<button type="button" class="btn lg" onclick={() => pomodoro.finish()}>Finish</button>{/if}
      <button type="button" class="btn ghost lg" onclick={() => pomodoro.stop()}>Stop</button>
    {/if}
  </div>

  {#if s.phase === 'lost'}<p class="lost">Left the window too long.</p>{/if}

  {#if s.phase === 'idle' && !stopwatch}
    <div class="chips" role="group" aria-label="Session length">
      {#each LENGTH_PRESETS as m (m)}
        <button type="button" class="chip" class:on={!custom && s.minutes === m} onclick={() => { custom = false; pomodoro.setLength(m); }}>{m}<span class="unit">min</span></button>
      {/each}
      <button type="button" class="chip" class:on={custom} onclick={() => (custom = !custom)}>Custom</button>
      {#if custom}
        <input class="input num" type="number" min="1" max="120" step="1" aria-label="Minutes" value={s.minutes} oninput={(e) => pomodoro.setLength(Number(e.currentTarget.value))} />
      {/if}
    </div>
  {/if}

  {#if s.phase === 'idle' && stopwatch}
    <label class="row" title="Seed the stopwatch with time you did not track">
      <span>Start from</span>
      <input class="input num" type="number" min="0" max="23" step="1" aria-label="Hours" value={seedH} oninput={(e) => seed(Number(e.currentTarget.value), seedM)} />
      <span>:</span>
      <input class="input num" type="number" min="0" max="59" step="1" aria-label="Minutes" value={seedM} oninput={(e) => seed(seedH, Number(e.currentTarget.value))} />
    </label>
  {/if}

  {#if pomodoro.lockable}
    <button type="button" class="toggle lock" class:on={pomodoro.screenLock} aria-pressed={pomodoro.screenLock}
      title="Leaving the window for more than ten seconds loses the session"
      onclick={() => pomodoro.setScreenLock(!pomodoro.screenLock)}>Screen lock</button>
  {/if}

  {#if over}
    <form class="summary" onsubmit={(e) => { e.preventDefault(); keep(); }}>
      <label class="eyebrow" for="pomodoro-summary">What did you work on?</label>
      <input id="pomodoro-summary" class="input" bind:this={box} bind:value={summary} type="text" autocomplete="off" />
      <CategoryPicker picked={picked} onpick={(ids) => (picked = ids)} />
      <div class="acts">
        <button type="submit" class="btn primary">Record</button>
        <button type="button" class="btn ghost" onclick={() => pomodoro.discard()}>Discard</button>
      </div>
    </form>
  {/if}

  <div class="today">
    <div><span class="eyebrow">Today</span><strong>{todayMs ? spanText(todayMs) : '0m'}</strong></div>
    <div><span class="eyebrow">Sessions</span><strong>{today.length}</strong></div>
    <button type="button" class="btn ghost sm" onclick={openStats}>Stats →</button>
  </div>
</div>

<style>
  .pom{display:flex;flex-direction:column;align-items:stretch;gap:14px;font-family:var(--sans);min-width:0}
  .modes{align-self:stretch}
  .face{position:relative;aspect-ratio:1;width:100%;max-width:210px;align-self:center}
  .face svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}
  .track{fill:none;stroke:var(--soft2);stroke-width:5}
  .arc{fill:none;stroke:var(--ink);stroke-width:5;stroke-linecap:round;transition:stroke-dashoffset 300ms linear,stroke 120ms}
  .pom[data-phase="idle"] .arc{stroke:transparent}
  .pom[data-phase="running"] .arc{stroke:var(--accent)}
  .pom[data-phase="lost"] .arc{stroke:var(--bad)}
  .dial{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
  .phase.bad{color:var(--bad)}
  .digits{font-size:2.9rem;font-weight:300;letter-spacing:-0.03em;line-height:1.05;font-variant-numeric:tabular-nums;color:var(--ink)}
  .sub{font-size:0.76rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .controls{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
  .controls .primary{min-width:96px}
  .lost{margin:-6px 0 0;text-align:center;font-size:0.8rem;color:var(--bad)}
  .chips{display:flex;flex-wrap:wrap;gap:5px;align-items:center;justify-content:center}
  .num{width:4.2em;height:26px;padding:0 6px;font-size:0.8rem;font-variant-numeric:tabular-nums}
  .row{display:flex;align-items:center;justify-content:center;gap:6px;font-size:0.8rem;color:var(--muted)}
  .lock{align-self:center}
  .summary{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--rule)}
  .acts{display:flex;gap:6px}
  .today{display:flex;align-items:flex-end;gap:18px;padding-top:12px;border-top:1px solid var(--rule)}
  .today div{display:flex;flex-direction:column;gap:2px}
  .today strong{font-size:1rem;font-weight:600;font-variant-numeric:tabular-nums;color:var(--ink)}
  .today .btn{margin-left:auto}
</style>
