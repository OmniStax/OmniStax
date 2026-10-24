<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, back, backLabel, actions, sub }: { title: string; back?: () => void; backLabel?: string; actions?: Snippet; sub?: Snippet } = $props();
</script>

<header class="page-head">
  {#if back}
    <button type="button" class="back" onclick={back}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      <span>{backLabel ?? 'Practice'}</span>
    </button>
  {/if}
  <div class="row">
    <h2 class="page-title">{title}</h2>
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </div>
  {#if sub}<div class="sub">{@render sub()}</div>{/if}
</header>

<style>
  .page-head{margin:0 0 4px}
  /* the way back is a line of its own above the title, read before it */
  .back{display:inline-flex;align-items:center;gap:2px;margin:0 0 6px -4px;padding:2px 8px 2px 4px;border:0;border-radius:6px;background:none;color:var(--muted);font:inherit;font-size:0.82rem;cursor:pointer}
  .back svg{width:14px;height:14px}
  .back:hover{color:var(--ink);background:var(--soft)}
  .back:focus-visible{outline:2px solid var(--accent)}
  .row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:28px}
  .actions{margin-left:auto;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  .sub{margin-top:4px}
</style>
