<script lang="ts">
  import type { Snippet } from 'svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import BackLink from '../ui/BackLink.svelte';

  let { title, back, backLabel, actions, sub }: { title: string; back?: () => void; backLabel?: string; actions?: Snippet; sub?: Snippet } = $props();
</script>

<header class="page-head">
  {#if back}<BackLink label={backLabel ?? i18n.t('practice.dashboard.title')} onclick={back} />{/if}
  <div class="row">
    <h2 class="page-title">{title}</h2>
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </div>
  {#if sub}<div class="sub">{@render sub()}</div>{/if}
</header>

<style>
  .page-head{margin:0 0 4px}
  .row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:28px}
  .actions{margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .sub{margin-top:4px}
</style>
