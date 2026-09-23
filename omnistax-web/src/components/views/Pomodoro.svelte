<script lang="ts">
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import { parseClock, ranMs, spanText } from '../../lib/pomodoro/model';
  import { settings } from '../../lib/settings/store.svelte';
  import { itemKey, viewItem } from '../../lib/types/ids';
  import { openItem } from '../../lib/sections/nav.svelte';
  import Vectors from '../pomodoro/Vectors.svelte';
  import CategoryPicker from '../pomodoro/CategoryPicker.svelte';
  const s = $derived(pomodoro.session);
  const stopwatch = $derived(s.mode === 'stopwatch');
  let summary = $state('');
  let picked = $state<readonly string[]>([]);
  let root = $state<HTMLDivElement | null>(null);
  let box = $state<HTMLInputElement | null>(null);
  let draft = $state<string | null>(null);

  $effect(() => { pomodoro.init(); });
  $effect(() => {
    if (!pomodoro.ended) return;
    summary = '';
    picked = [];
    root?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    requestAnimationFrame(() => box?.focus());
  });
  const keep = (): void => { pomodoro.keep(summary, picked); summary = ''; picked = []; };
  const openStats = (): void => { void openItem(itemKey(viewItem('pomodoro-stats'))); };

  const edit = (): void => { draft = pomodoro.clock; };
  const commit = (): void => {
    const ms = draft === null ? null : parseClock(draft);
    if (ms !== null) pomodoro.setClock(ms);
    draft = null;
  };
  const focusSelect = (el: HTMLInputElement): void => { el.focus(); el.select(); };

  const endsAt = $derived(!stopwatch && s.phase === 'running'
    ? new Date(Date.now() + pomodoro.left).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '');

  const midnight = (): number => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const today = $derived(pomodoro.log.filter((p) => p.completed && p.start >= midnight()));
  const todayMs = $derived(today.reduce((n, p) => n + ranMs(p), 0));
</script>

<div class="pom" bind:this={root} data-phase={s.phase}>
  <div class="head">
    <div class="seg modes" role="group" aria-label="Timing mode">
      <button type="button" class:on={!stopwatch} disabled={s.phase !== 'idle'} onclick={() => pomodoro.setMode('pomodoro')}>Pomodoro</button>
      <button type="button" class:on={stopwatch} disabled={s.phase !== 'idle'} onclick={() => pomodoro.setMode('stopwatch')}>Stopwatch</button>
    </div>
    {#if pomodoro.lockable}
      <button type="button" class="lock" class:on={pomodoro.screenLock} aria-pressed={pomodoro.screenLock} aria-label="Screen lock"
        title="Cursor must not leave OmniStax for more than {settings.lockGrace} seconds"
        onclick={() => pomodoro.setScreenLock(!pomodoro.screenLock)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path class="shackle" d="M8 11V7.5a4 4 0 0 1 8 0V11" />
          <rect class="body" x="5" y="11" width="14" height="10" rx="2.2" />
        </svg>
      </button>
    {/if}
  </div>

  <div class="face">
    <Vectors running={s.phase === 'running'} />
    <div class="dial">
      {#if draft !== null}
        <input class="digits edit" type="text" inputmode="numeric" aria-label={stopwatch ? 'Start from' : 'Length'} bind:value={draft} use:focusSelect
          onkeydown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') draft = null; }} onblur={commit} />
      {:else if s.phase === 'idle'}
        <button type="button" class="digits" aria-label={stopwatch ? 'Start from' : 'Length'} onclick={edit}>{pomodoro.clock}</button>
      {:else}
        <span class="digits" aria-live="off">{pomodoro.clock}</span>
      {/if}
      {#if endsAt}<span class="sub">ends {endsAt}</span>{/if}
    </div>
  </div>

  <div class="controls">
    {#if s.phase === 'idle' || s.phase === 'done'}
      <button type="button" class="btn primary lg" onclick={() => pomodoro.start()}>Start</button>
    {:else}
      {#if s.phase === 'running'}
        <button type="button" class="btn primary lg" onclick={() => pomodoro.pause()}>Pause</button>
      {:else}
        <button type="button" class="btn primary lg" onclick={() => pomodoro.resume()}>Resume</button>
      {/if}
      {#if stopwatch}
        <button type="button" class="btn lg" onclick={() => pomodoro.finish()}>Finish</button>
      {:else}
        <button type="button" class="btn ghost lg" onclick={() => pomodoro.stop()}>Stop</button>
      {/if}
    {/if}
  </div>

  {#if pomodoro.lost}<p class="lost">Left the window too long.</p>{/if}

  {#if s.phase === 'done'}
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
  .head{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .lock{display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--muted);cursor:pointer;transition:color 120ms,background-color 120ms}
  .lock:hover{background:var(--soft);color:var(--ink)}
  .lock.on{color:var(--accent)}
  .lock:focus-visible{outline:none;box-shadow:0 0 0 2px var(--panel),0 0 0 4px color-mix(in srgb,var(--accent) 55%,transparent)}
  .lock svg{width:20px;height:20px;overflow:visible}
  .shackle{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;transform-origin:16px 11px;transform:translateY(-3px) rotate(28deg);transition:transform 260ms cubic-bezier(.3,1.4,.5,1)}
  .lock.on .shackle{transform:none}
  .body{fill:currentColor}
  .face{position:relative;aspect-ratio:1;width:100%;max-width:210px;align-self:center}
  .dial{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
  .digits{font-family:var(--sans);font-size:2.9rem;font-weight:300;letter-spacing:-0.03em;line-height:1.05;font-variant-numeric:tabular-nums;color:var(--ink);padding:0 6px;border:0;border-radius:8px;background:transparent}
  button.digits{cursor:text}
  button.digits:hover{background:color-mix(in srgb,var(--soft) 70%,transparent)}
  .edit{width:5em;text-align:center;outline:none;background:var(--soft)}
  .sub{font-size:0.76rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .controls{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
  .controls .primary{min-width:96px}
  .lost{margin:-6px 0 0;text-align:center;font-size:0.8rem;color:var(--bad)}
  .summary{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--rule)}
  .acts{display:flex;gap:6px}
  .today{display:flex;align-items:flex-end;gap:18px;padding-top:12px;border-top:1px solid var(--rule)}
  .today div{display:flex;flex-direction:column;gap:2px}
  .today strong{font-size:1rem;font-weight:600;font-variant-numeric:tabular-nums;color:var(--ink)}
  .today .btn{margin-left:auto}
</style>
