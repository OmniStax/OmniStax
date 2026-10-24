<script lang="ts">
  /* An alert, where the tip of the day stands and above it when both show. */
  import { alerts } from '../../lib/alerts.svelte';
</script>

{#if alerts.current}
  {@const a = alerts.current}
  <aside class="alert-toast" role="alert">
    <p>{a.text}</p>
    <div class="foot">
      {#if a.action}{@const act = a.action}<button type="button" class="btn sm" onclick={() => { act.run(); alerts.close(); }}>{act.label}</button>{/if}
      <button type="button" class="btn ghost sm" onclick={() => alerts.close()}>Close</button>
    </div>
  </aside>
{/if}

<style>
  .alert-toast{position:fixed;right:22px;bottom:72px;z-index:126;width:min(320px,calc(100vw - 32px));box-sizing:border-box;padding:12px 16px;border:1px solid var(--bad);border-radius:8px;background:var(--panel);color:var(--ink);font-family:var(--sans);font-size:0.84rem;box-shadow:0 10px 30px rgba(0,0,0,.18)}
  p{margin:0 0 10px}
  .foot{display:flex;align-items:center;justify-content:flex-end;gap:8px}
</style>
