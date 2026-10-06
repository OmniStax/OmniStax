<script lang="ts">
  /* A deploy reached this page while it was open: one line at the foot of the
     window, the same manners as the drag and import toasts, but it waits to be
     answered. */
  import { offlineBooks } from '../../lib/offline/store.svelte';
</script>

{#if offlineBooks.appUpdated}
  <div class="update-toast" role="status">
    <span>OmniStax was updated.</span>
    <button type="button" class="btn sm" onclick={() => location.reload()}>Reload</button>
    <button type="button" class="btn ghost icon sm" title="Close" aria-label="Close" onclick={() => offlineBooks.dismissUpdate()}>×</button>
  </div>
{/if}

<style>
  .update-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:130;display:flex;align-items:center;gap:10px;white-space:nowrap;padding:6px 8px 6px 16px;border:1px solid var(--rule);border-radius:8px;background:var(--panel);color:var(--muted);font-family:var(--sans);font-size:1.05rem;line-height:1.4;box-shadow:0 2px 10px rgb(0 0 0 / 0.16);animation:update-toast-in 120ms ease-out}
  @keyframes update-toast-in{from{opacity:0}to{opacity:1}}
  @media (prefers-reduced-motion:reduce){ .update-toast{animation:none} }
</style>
