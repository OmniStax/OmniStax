<script lang="ts">
  /* One line at the foot of the window while files are coming in, and a moment
     after they have: which file is being read, how far a long PDF has got, and
     what could not be taken. It lies over the page rather than in it, so
     nothing moves when it comes and goes — the same manners as the drag toast,
     which says its own thing about a card being carried. */
  let { line }: { line: string | null } = $props();
</script>

{#if line}
  <div class="import-toast" role="status">{line}</div>
{/if}

<style>
  .import-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:130;pointer-events:none;max-width:min(80vw,640px);padding:9px 16px;border:1px solid var(--rule);border-radius:8px;background:var(--panel);color:var(--muted);font-family:var(--sans);font-size:1.05rem;line-height:1.4;box-shadow:0 2px 10px rgb(0 0 0 / 0.16);animation:import-toast-in 120ms ease-out}
  @keyframes import-toast-in{from{opacity:0}to{opacity:1}}
  @media (prefers-reduced-motion:reduce){ .import-toast{animation:none} }
</style>
