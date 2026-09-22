<script lang="ts">
  /* While a card is being dragged out of a panel, one line at the foot of the
     window says so and says what the other button is for — the gesture is not
     one a reader arrives already knowing. It stays a moment after the drop so
     that it is read rather than glimpsed, and it lies over the page rather than
     in it, so nothing moves when it comes and goes. */
  import { onMount } from 'svelte';
  import { onDragToast } from '../../lib/notes/md/dragout';
  import { settings } from '../../lib/settings/store.svelte';

  /* How long the line stays after the card lands. */
  const LINGER_MS = 500;
  let shown = $state(false);
  const text = $derived(settings.swapDragButtons
    ? 'Dragging. Left-click + drag to select text instead'
    : 'Dragging. Right-click + drag to select text instead');

  onMount(() => {
    let timer = 0;
    onDragToast((dragging) => {
      if (timer) { clearTimeout(timer); timer = 0; }
      if (dragging) { shown = true; return; }
      timer = window.setTimeout(() => { timer = 0; shown = false; }, LINGER_MS);
    });
    return () => { if (timer) clearTimeout(timer); onDragToast(null); };
  });
</script>

{#if shown}
  <div class="drag-toast" role="status">{text}</div>
{/if}

<style>
  .drag-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:130;pointer-events:none;white-space:nowrap;padding:5px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--muted);font-family:var(--sans);font-size:0.78rem;line-height:1.5;box-shadow:0 2px 10px rgb(0 0 0 / 0.16);animation:drag-toast-in 120ms ease-out}
  @keyframes drag-toast-in{from{opacity:0}to{opacity:1}}
  @media (prefers-reduced-motion:reduce){ .drag-toast{animation:none} }
</style>
