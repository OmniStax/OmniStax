<script lang="ts">
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  const until = $derived(pomodoro.awayUntil);
  let now = $state(Date.now());
  $effect(() => {
    if (until === null) return;
    now = Date.now();
    const t = setInterval(() => { now = Date.now(); }, 200);
    return () => clearInterval(t);
  });
  const secs = $derived(until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000)));
</script>

{#if until !== null}
  <div class="wash" role="alert">
    <p>Session failing in <strong>{secs}</strong> {secs === 1 ? 'second' : 'seconds'}</p>
  </div>
{/if}

<style>
  .wash{position:fixed;inset:0;z-index:200;display:grid;place-items:center;pointer-events:none;background:color-mix(in srgb,#e0263a 22%,transparent);box-shadow:inset 0 0 0 4px color-mix(in srgb,#e0263a 70%,transparent);animation:pulse 1s ease-in-out infinite alternate}
  p{margin:0;padding:12px 20px;border-radius:12px;background:color-mix(in srgb,var(--panel) 88%,transparent);color:#c21f32;font-family:var(--sans);font-size:1.3rem;font-weight:500}
  strong{font-variant-numeric:tabular-nums;font-weight:700}
  @keyframes pulse{from{background:color-mix(in srgb,#e0263a 16%,transparent)}to{background:color-mix(in srgb,#e0263a 26%,transparent)}}
  @media (prefers-reduced-motion: reduce){.wash{animation:none}}
</style>
