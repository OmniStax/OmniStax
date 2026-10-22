<script lang="ts">
  /* A line diff drawn as its changed stretches, each with a few unchanged lines around it. */
  import type { Hunk } from '../../lib/sync/diff';
  import { i18n } from '../../lib/i18n/store.svelte';
  let { hunks, tail }: { hunks: readonly Hunk[]; tail: number } = $props();
  const SIGN = { same: ' ', del: '−', add: '+' } as const;
</script>

{#snippet skipped(n: number)}
  {#if n}<div class="skip">{i18n.t('shell.lineDiff.unchanged', { n })}</div>{/if}
{/snippet}

<div class="code" role="table" aria-label={i18n.t('shell.lineDiff.label')}>
  {#each hunks as h, i (i)}
    {@render skipped(h.skipped)}
    {#each h.lines as l, j (j)}
      <div class="line {l.kind}" role="row"><span class="no">{l.a ?? ''}</span><span class="no">{l.b ?? ''}</span><span class="sign">{SIGN[l.kind]}</span><span class="text">{l.text}</span></div>
    {/each}
  {/each}
  {@render skipped(tail)}
</div>

<style>
  .code{border:1px solid var(--rule);border-radius:6px;background:var(--panel);font-family:var(--mono);font-size:.76rem;line-height:1.55;overflow:hidden}
  .line{display:grid;grid-template-columns:3.5em 3.5em 1.5em minmax(0,1fr)}
  .no{text-align:right;padding-right:8px;color:var(--muted);font-variant-numeric:tabular-nums;user-select:none}
  .sign{text-align:center;user-select:none}
  .text{white-space:pre-wrap;overflow-wrap:anywhere;padding-right:8px}
  .line.del{background:color-mix(in srgb,var(--bad) 12%,transparent)}
  .line.add{background:color-mix(in srgb,var(--ok) 14%,transparent)}
  .line.del .sign{color:var(--bad)} .line.add .sign{color:var(--ok)}
  .skip{padding:2px 12px;background:var(--soft);color:var(--muted);font-family:var(--sans);font-size:.74rem}
</style>
