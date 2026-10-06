<script lang="ts">
  import type { Standing } from '../../lib/practice/model';
  import { standingLine } from '../../lib/practice/labels';

  let { standing }: { standing: Standing } = $props();

  const total = $derived(standing.untouched + standing.practised + standing.mastered);
  const pct = (n: number): string => `${n / total * 100}%`;
</script>

<span class="standing-meter" role="img" aria-label={standingLine(standing)}>
  {#if total > 0}
    <i class="meter-mastered" style:width={pct(standing.mastered)}></i>
    <i class="meter-practised" style:width={pct(standing.practised)}></i>
    <i class="meter-untouched" style:width={pct(standing.untouched)}></i>
  {/if}
</span>

<style>
  .standing-meter{min-width:64px;height:6px;display:flex;overflow:hidden;border-radius:999px;background:var(--soft2);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rule) 70%,transparent)}
  .standing-meter i{height:100%;display:block}
  .meter-mastered{background:var(--m-high)}
  .meter-practised{background:var(--m-mid)}
  .meter-untouched{background:var(--soft2)}
</style>
