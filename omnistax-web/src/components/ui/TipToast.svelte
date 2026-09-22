<script lang="ts">
  /* The tip of the day, at the bottom right and clear of the toasts at the
     foot of the window. It stays until it is closed. */
  import { onMount, tick } from 'svelte';
  import { tips } from '../../lib/tips/store.svelte';
  import type { TipAction } from '../../lib/tips/model';
  import { settings } from '../../lib/settings/store.svelte';
  import { commands } from '../../lib/commands/registry.svelte';
  import { BUILTIN, openViewId, showViewId } from '../../lib/commands/builtin';

  const act = async (kind: TipAction): Promise<void> => {
    tips.close();
    if (kind === 'new-drawing') { commands.run(BUILTIN.drawingNew); return; }
    if (kind === 'colours') { commands.run(openViewId('colours')); return; }
    commands.run(showViewId('explorer'));
    await tick();
    document.getElementById('import-files')?.click();
  };
  const stop = (): void => { settings.setTips(false); tips.close(); };

  onMount(() => tips.arrive(settings.tips));
  $effect(() => { if (!settings.tips) tips.close(); });
</script>

{#if tips.current}
  {@const tip = tips.current}
  <aside class="tip-toast" aria-label="Tip">
    <div class="head">
      <span class="eyebrow">Tip</span>
      <button type="button" class="btn ghost icon sm" title="Close" aria-label="Close tip" onclick={() => tips.close()}>×</button>
    </div>
    <p>{tip.text}</p>
    <div class="foot">
      <button type="button" class="btn ghost sm stop" onclick={stop}>Stop showing tips</button>
      {#if tip.action}{@const a = tip.action}<button type="button" class="btn sm" onclick={() => void act(a.kind)}>{a.label}</button>{/if}
    </div>
  </aside>
{/if}

<style>
  .tip-toast{position:fixed;right:22px;bottom:72px;z-index:125;width:min(320px,calc(100vw - 32px));box-sizing:border-box;padding:10px 12px 10px 16px;border:1px solid var(--rule);border-radius:8px;background:var(--panel);color:var(--ink);font-family:var(--sans);font-size:0.86rem;line-height:1.45;box-shadow:0 2px 10px rgb(0 0 0 / 0.16);animation:tip-toast-in 120ms ease-out}
  .head{display:flex;align-items:center;justify-content:space-between}
  .eyebrow{font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)}
  p{margin:4px 0 10px}
  .foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .stop{margin-left:-9px;font-weight:500}
  .foot .btn:only-child{margin-right:auto}
  @keyframes tip-toast-in{from{opacity:0}to{opacity:1}}
  @media (prefers-reduced-motion:reduce){ .tip-toast{animation:none} }
</style>
