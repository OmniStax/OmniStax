<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, back, backLabel, actions, sub }: { title: string; back?: () => void; backLabel?: string; actions?: Snippet; sub?: Snippet } = $props();
</script>

<header class="page-head">
  <div class="row">
    {#if back}<button type="button" class="btn ghost sm" onclick={back}>‹ {backLabel ?? 'Practice'}</button>{/if}
    <h2 class="eyebrow">{title}</h2>
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </div>
  {#if sub}<div class="sub">{@render sub()}</div>{/if}
</header>

<style>
  .page-head{margin:0 0 4px}
  .row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:28px}
  h2.eyebrow{margin:0;line-height:1}
  .actions{margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .sub{margin-top:4px}
</style>
